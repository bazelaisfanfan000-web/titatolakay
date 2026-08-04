import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = await request.json();
    const { amount = 1 } = body;

    if (amount !== 1 && amount !== 2) {
      return NextResponse.json(
        { success: false, error: "Montant invalide (1 ou 2 HTG)" },
        { status: 400 }
      );
    }

    // Récupérer le solde actuel
    const balanceRef = adminDB.ref(`users/${uid}/balance`);
    const balanceSnapshot = await balanceRef.get();

    const currentBalance = balanceSnapshot.val() || 0;

    if (currentBalance < amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Solde insuffisant",
          currentBalance 
        },
        { status: 400 }
      );
    }

    // Déduire le montant avec transaction pour éviter les double-dépenses
    await adminDB.ref(`users/${uid}/balance`).transaction((currentBalance) => {
      if (currentBalance === null) currentBalance = 0;
      if (currentBalance < amount) {
        return; // Annuler la transaction si solde insuffisant
      }
      return currentBalance - amount;
    });

    // Récupérer le nouveau solde
    const newBalanceSnapshot = await balanceRef.get();
    const newBalance = newBalanceSnapshot.val() || 0;

    // Enregistrer la transaction
    const transactionRef = adminDB.ref(`users/${uid}/transactions`).push();
    await transactionRef.set({
      type: "chat_message",
      amount: -amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      newBalance,
      amountDeducted: amount,
    });

  } catch (error: any) {
    console.error("Erreur déduction chat:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
