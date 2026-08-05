import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const prisma = getPrisma();
  try {
    const body = await request.json();
    const { amount, moncashNumber } = body;

    // Validation du montant
    if (!amount || amount < 100) {
      return NextResponse.json(
        { success: false, error: "Le montant minimum est de 100 HTG" },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { success: false, error: "Le montant maximum est de 10 000 HTG" },
        { status: 400 }
      );
    }

    // Validation du numéro MonCash
    const phoneRegex = /^\+509\d{8}$/;
    if (!moncashNumber || !phoneRegex.test(moncashNumber)) {
      return NextResponse.json(
        { success: false, error: "Numéro MonCash invalide (format: +509XXXXXXXX)" },
        { status: 400 }
      );
    }

    // TODO: Récupérer l'utilisateur authentifié depuis le token JWT
    const userId = "user_id_placeholder";

    // Récupérer le solde de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier que le solde est suffisant
    if (user.balance < amount) {
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    // Calcul des frais (5%)
    const feeRate = 0.05;
    const fee = Math.round((amount * feeRate) * 100) / 100;
    const amountNet = Math.round((amount - fee) * 100) / 100;

    // Transaction atomique : déduire le solde et créer la transaction
    const result = await prisma.$transaction(async (tx) => {
      // Déduire le montant du solde
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Créer la transaction
      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          type: "WITHDRAWAL",
          amount_gross: amount,
          fee: fee,
          amount_net: amountNet,
          status: "PENDING",
          description: `Retrait de ${amount} HTG vers ${moncashNumber}`,
        },
      });

      return { user: updatedUser, transaction };
    });

    // TODO: Intégration avec MonCashConnect
    // Envoyer la requête de retrait via l'API MonCashConnect
    // const moncashResponse = await createMonCashWithdrawal({
    //   amount: amountNet,
    //   phone: moncashNumber,
    //   reference: result.transaction.id,
    // });

    return NextResponse.json({
      success: true,
      transactionId: result.transaction.id,
      amountGross: amount,
      fee: fee,
      amountNet: amountNet,
      newBalance: result.user.balance,
    });

  } catch (error) {
    console.error("[WITHDRAW_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
