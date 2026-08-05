import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, status, amount, type } = body;

    // Validation des données du webhook
    if (!reference || !status) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    console.log("[MONCASH_WEBHOOK] Notification reçue:", { reference, status, amount, type });

    // Récupérer la transaction correspondante
    const transaction = await prisma.transaction.findFirst({
      where: { reference_api: reference },
      include: { user: true },
    });

    if (!transaction) {
      console.error("[MONCASH_WEBHOOK] Transaction non trouvée:", reference);
      return NextResponse.json(
        { success: false, error: "Transaction non trouvée" },
        { status: 404 }
      );
    }

    // Si la transaction est déjà terminée, ignorer
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
      console.log("[MONCASH_WEBHOOK] Transaction déjà traitée:", reference);
      return NextResponse.json({ success: true });
    }

    // Traitement selon le statut
    if (status === "success") {
      if (transaction.type === "DEPOSIT") {
        // Créditer le solde du joueur
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: transaction.user_id },
            data: {
              balance: {
                increment: transaction.amount_net,
              },
            },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESS",
            },
          });
        });

        console.log("[MONCASH_WEBHOOK] Dépôt crédité:", {
          userId: transaction.user_id,
          amount: transaction.amount_net,
        });

      } else if (transaction.type === "WITHDRAWAL") {
        // Le retrait a déjà été déduit au moment de la demande
        // Juste mettre à jour le statut
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
          },
        });

        console.log("[MONCASH_WEBHOOK] Retrait confirmé:", {
          userId: transaction.user_id,
          amount: transaction.amount_net,
        });
      }

    } else if (status === "failed" || status === "expired") {
      // Rembourser le joueur si nécessaire
      if (transaction.type === "WITHDRAWAL") {
        // Le montant a déjà été déduit, il faut le rembourser
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: transaction.user_id },
            data: {
              balance: {
                increment: transaction.amount_gross,
              },
            },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: status === "failed" ? "FAILED" : "EXPIRED",
            },
          });
        });

        console.log("[MONCASH_WEBHOOK] Retrait remboursé:", {
          userId: transaction.user_id,
          amount: transaction.amount_gross,
        });

      } else if (transaction.type === "DEPOSIT") {
        // Pour un dépôt, rien à rembourser (le solde n'a pas été crédité)
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: status === "failed" ? "FAILED" : "EXPIRED",
          },
        });

        console.log("[MONCASH_WEBHOOK] Dépôt échoué:", {
          userId: transaction.user_id,
          amount: transaction.amount_gross,
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[MONCASH_WEBHOOK] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
