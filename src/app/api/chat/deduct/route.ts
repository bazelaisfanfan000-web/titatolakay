import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentification
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

    // 2. Body
    const body = await request.json();
    let { amount = 1 } = body;
    amount = Number(amount);

    if (isNaN(amount) || amount < 1 || amount > 2) {
      return NextResponse.json(
        { success: false, error: "Montant invalide (1 ou 2 HTG)" },
        { status: 400 }
      );
    }

    // 3. Référence à l'utilisateur complet (pour transaction)
    const userRef = adminDB.ref(`users/${uid}`);

    // 4. Vérification préalable (optionnelle, pour log)
    const snapshot = await userRef.child("balance").get();
    const rawBalance = snapshot.val();
    const currentBalance = Number(rawBalance) || 0;

    console.log("[CHAT_DEDUCT] Solde actuel (GET):", currentBalance);

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Solde insuffisant",
          currentBalance,
          required: amount,
        },
        { status: 400 }
      );
    }

    // 5. Transaction atomique sur l'OBJET utilisateur
    const result = await userRef.transaction((user) => {
      // Si l'utilisateur n'existe pas, on le crée (normalement il existe)
      if (user === null) {
        return { balance: 0 };
      }

      // Lire le solde actuel depuis l'objet
      const balance = user.balance || 0;

      console.log("[CHAT_DEDUCT] Dans transaction - balance lue:", balance);

      // Vérifier si le solde est suffisant
      if (balance < amount) {
        console.log("[CHAT_DEDUCT] Transaction annulée (solde insuffisant)");
        return; // annule la transaction
      }

      // Déduire le montant
      user.balance = balance - amount;

      // Mettre à jour le timestamp (optionnel)
      user.balanceUpdatedAt = Date.now();

      return user; // retourne l'objet modifié
    });

    if (!result.committed) {
      console.error("[CHAT_DEDUCT] Transaction non committed");
      return NextResponse.json(
        { success: false, error: "Transaction échouée" },
        { status: 500 }
      );
    }

    const newBalance = result.snapshot.val()?.balance || 0;

    console.log("[CHAT_DEDUCT] ✅ Nouveau solde:", newBalance);

    // 6. Enregistrer la transaction (historique)
    const transactionId = `${Date.now()}_${uid}`;
    const txRef = adminDB.ref(`wallet_transactions/${uid}/${transactionId}`);
    await txRef.set({
      id: transactionId,
      userId: uid,
      type: "chat_message",
      amount: -amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: "chat",
      status: "completed",
      source: "chat",
      description: `Message de chat - ${amount} HTG`,
      metadata: { amount },
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      newBalance,
      amountDeducted: amount,
    });
  } catch (error: any) {
    console.error("[CHAT_DEDUCT] ❌ ERREUR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}