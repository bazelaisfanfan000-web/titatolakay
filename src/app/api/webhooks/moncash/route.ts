import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { constructEvent, MonCashError } from "@moncashconnect/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// [FIX] Helper pour les réponses JSON avec code HTTP personnalisé
function webhookJson(
  success: boolean,
  message: string,
  extra?: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json({ success, message, ...extra }, { status });
}

export async function POST(request: Request) {
  const prisma = getPrisma();

  try {
    // --- 1. Lire le body brut et les headers ---
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");

    // --- 2. Vérification de la signature (SÉCURITÉ) ---
    if (!signature || !timestamp) {
      console.error("[MONCASH_WEBHOOK] Headers signature/timestamp manquants");
      return webhookJson(false, "unauthorized", undefined, 401);
    }

    const webhookSecret = process.env.MONCASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[MONCASH_WEBHOOK] MONCASH_WEBHOOK_SECRET non configuré");
      return webhookJson(false, "server_misconfigured", undefined, 500);
    }

    let event: {
      event: string;
      reference: string;
      amount?: number;
      completedAt?: string;
      failureReason?: string;
      recipient_account_masked?: string;
    };

    try {
      // Utilisation de la même méthode que pour l'autre webhook
      event = constructEvent(
        Buffer.from(body),
        signature,
        timestamp,
        webhookSecret
      ) as typeof event;
    } catch (err) {
      if (err instanceof MonCashError) {
        console.error("[MONCASH_WEBHOOK] Signature invalide:", err.message);
        return webhookJson(false, err.message, undefined, err.statusCode || 401);
      }
      console.error("[MONCASH_WEBHOOK] Erreur constructEvent:", err);
      return webhookJson(false, "processing", undefined, 200);
    }

    console.log("[MONCASH_WEBHOOK] Notification reçue:", {
      event: event.event,
      reference: event.reference,
      amount: event.amount,
    });

    // --- 3. Validation des données ---
    const { reference, event: eventType, amount } = event;
    if (!reference) {
      return webhookJson(false, "reference_missing", undefined, 400);
    }

    // --- 4. Idempotence : Vérifier si la transaction existe déjà dans Prisma ---
    const transaction = await prisma.transaction.findFirst({
      where: { reference_api: reference },
      include: { user: true },
    });

    if (!transaction) {
      console.error("[MONCASH_WEBHOOK] Transaction non trouvée:", reference);
      // Erreur définitive : on retourne 200 pour que MonCash ne réessaie pas
      return webhookJson(false, "transaction_not_found", undefined, 200);
    }

    // Si la transaction est déjà dans un état terminal, on ignore (idempotence)
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED" || transaction.status === "EXPIRED") {
      console.log("[MONCASH_WEBHOOK] Transaction déjà traitée:", reference);
      return webhookJson(true, "already_processed");
    }

    // --- 5. Traitement selon le type d'événement MonCash ---
    // On mappe les événements MonCash vers nos statuts internes
    const isSuccess = eventType === "payment.completed" || eventType === "payout.completed";
    const isFailed = eventType === "payment.failed" || eventType === "payout.failed";
    const isExpired = eventType === "payment.expired"; // selon votre API

    if (isSuccess) {
      // Vérification du montant (tolérance)
      const expectedAmount = transaction.type === "DEPOSIT" ? transaction.amount_net : transaction.amount_net;
      if (amount && Math.abs(Number(amount) - expectedAmount) > 0.01) {
        console.error("[MONCASH_WEBHOOK] Montant mismatch:", {
          expected: expectedAmount,
          received: amount,
        });
        return webhookJson(false, "amount_mismatch", undefined, 200);
      }

      // --- DÉPÔT : Créditer le solde ---
      if (transaction.type === "DEPOSIT") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: transaction.user_id },
            data: {
              balance: {
                increment: transaction.amount_net, // ✅ Utilisation du net (3% déjà déduits)
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
      }

      // --- RETRAIT : Confirmer le retrait (solde déjà déduit) ---
      else if (transaction.type === "WITHDRAWAL") {
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

      return webhookJson(true, "success");

    } else if (isFailed || isExpired) {
      // --- DÉPÔT ÉCHOUÉ : Rien à rembourser (le solde n'a pas été crédité) ---
      if (transaction.type === "DEPOSIT") {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: isFailed ? "FAILED" : "EXPIRED",
          },
        });

        console.log("[MONCASH_WEBHOOK] Dépôt échoué:", {
          userId: transaction.user_id,
          amount: transaction.amount_gross,
        });
      }

      // --- RETRAIT ÉCHOUÉ : Rembourser le joueur (rollback) ---
      else if (transaction.type === "WITHDRAWAL") {
        await prisma.$transaction(async (tx) => {
          // Recréditer le montant BRUT (car il avait été déduit intégralement)
          await tx.user.update({
            where: { id: transaction.user_id },
            data: {
              balance: {
                increment: transaction.amount_gross, // ✅ Montant brut (100 HTG pour 100 HTG retirés)
              },
            },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: isFailed ? "FAILED" : "EXPIRED",
            },
          });
        });

        console.log("[MONCASH_WEBHOOK] Retrait remboursé:", {
          userId: transaction.user_id,
          amount: transaction.amount_gross,
        });
      }

      return webhookJson(true, "failed_recorded");
    }

    // Événement non géré (ex: "payment.pending") : on ignore
    console.warn("[MONCASH_WEBHOOK] Événement non géré:", eventType);
    return webhookJson(true, "ignored");

  } catch (error) {
    console.error("[MONCASH_WEBHOOK] Erreur:", error);

    // [FIX] On retourne 500 pour les erreurs récupérables (ex: panne DB)
    // pour que MonCash réessaie. Si c'est une erreur de validation, on renverrait 400/200.
    // Ici, on retourne 500 car toute erreur inattendue est récupérable.
    return webhookJson(
      false,
      "internal_error",
      undefined,
      500
    );
  }
}