import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;

    // Validation
    if (!amount || amount < 25) {
      return NextResponse.json(
        { success: false, error: "Le montant minimum est de 25 HTG" },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { success: false, error: "Le montant maximum est de 10 000 HTG" },
        { status: 400 }
      );
    }

    // TODO: Récupérer l'utilisateur authentifié depuis le token JWT
    // Pour l'instant, simulé avec un ID fixe
    const userId = "user_id_placeholder";

    // Calcul des frais (3%)
    const feeRate = 0.03;
    const fee = Math.round((amount * feeRate) * 100) / 100;
    const amountNet = Math.round((amount - fee) * 100) / 100;

    // Créer la transaction en base de données
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: "DEPOSIT",
        amount_gross: amount,
        fee: fee,
        amount_net: amountNet,
        status: "PENDING",
        description: `Dépôt de ${amount} HTG`,
      },
    });

    // TODO: Intégration avec MonCashConnect
    // Créer une requête de paiement via l'API MonCashConnect
    // const moncashResponse = await createMonCashPayment({
    //   amount: amount,
    //   reference: transaction.id,
    //   returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet/deposit-return?transactionId=${transaction.id}`,
    // });

    // Pour l'instant, retourner une réponse simulée
    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      amountGross: amount,
      fee: fee,
      amountNet: amountNet,
      paymentUrl: "https://moncashconnect.example.com/payment", // URL simulée
    });

  } catch (error) {
    console.error("[DEPOSIT_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
