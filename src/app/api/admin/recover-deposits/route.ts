/**
 * API Route: Récupération des dépôts échoués
 * POST /api/admin/recover-deposits
 * Permet de traiter manuellement les webhooks qui ont échoué
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Reference requise" },
        { status: 400 }
      );
    }

    console.log("[RECOVER_DEPOSITS] Récupération du dépôt:", reference);

    // Récupérer l'événement échoué
    const failedEventRef = adminDB.ref(`failed_webhook_events/${reference}`);
    const failedEventSnapshot = await failedEventRef.once("value");

    if (!failedEventSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Événement échoué non trouvé" },
        { status: 404 }
      );
    }

    const failedEvent = failedEventSnapshot.val();
    console.log("[RECOVER_DEPOSITS] Événement échoué trouvé:", failedEvent);

    // Rechercher le dépôt via deposit_index
    const indexRef = adminDB.ref(`deposit_index/${reference}`);
    const indexSnapshot = await indexRef.once("value");

    if (!indexSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Dépôt non trouvé dans deposit_index" },
        { status: 404 }
      );
    }

    const indexData = indexSnapshot.val();
    console.log("[RECOVER_DEPOSITS] Index trouvé:", indexData);

    // Récupérer le dépôt complet
    const depositRef = adminDB.ref(`deposits/${indexData.userId}/${indexData.depositId}`);
    const depositSnapshot = await depositRef.once("value");

    if (!depositSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Dépôt introuvable dans deposits" },
        { status: 404 }
      );
    }

    const depositData = depositSnapshot.val();
    console.log("[RECOVER_DEPOSITS] Dépôt trouvé:", depositData);

    // Vérifier que le dépôt est en pending
    if (depositData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Dépôt déjà traité avec statut: ${depositData.status}` },
        { status: 400 }
      );
    }

    // Vérifier que le montant correspond
    if (depositData.amount !== failedEvent.amount) {
      return NextResponse.json(
        { success: false, error: "Montant mismatch" },
        { status: 400 }
      );
    }

    // Créditer le wallet
    const userRef = adminDB.ref(`users/${indexData.userId}`);
    const userSnapshot = await userRef.once("value");
    const oldBalance = userSnapshot.exists() ? Number(userSnapshot.val()?.balance || 0) : 0;

    console.log("[RECOVER_DEPOSITS] Solde avant crédit:", { userId: indexData.userId, oldBalance });

    const transactionResult = await userRef.transaction((current: any) => {
      if (!current) {
        return; // Annuler
      }

      const currentBalance = Number(current.balance || 0);
      const newBalance = currentBalance + failedEvent.amount;

      return {
        ...current,
        balance: newBalance,
        updatedAt: Date.now()
      };
    });

    if (!transactionResult.committed) {
      return NextResponse.json(
        { success: false, error: "Transaction Firebase échouée" },
        { status: 500 }
      );
    }

    const newBalance = transactionResult.snapshot.val()?.balance || 0;
    console.log("[RECOVER_DEPOSITS] Crédit réussi:", { userId: indexData.userId, newBalance });

    // Créer wallet_transaction
    const crypto = require("crypto");
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    await adminDB.ref(`wallet_transactions/${indexData.userId}/${transactionId}`).set({
      type: "deposit",
      amount: failedEvent.amount,
      reference: reference,
      depositId: indexData.depositId,
      status: "completed",
      oldBalance,
      newBalance,
      createdAt: Date.now()
    });

    // Mettre à jour le dépôt
    await depositRef.update({
      status: "completed",
      moncashTransactionId: reference,
      netAmount: failedEvent.amount,
      completedAt: Date.now()
    });

    // Mettre à jour l'index
    await indexRef.update({
      status: "completed",
      completedAt: Date.now()
    });

    // Supprimer l'événement échoué
    await failedEventRef.remove();

    console.log("[RECOVER_DEPOSITS] Récupération réussie:", {
      reference,
      userId: indexData.userId,
      amount: failedEvent.amount,
      newBalance
    });

    return NextResponse.json({
      success: true,
      message: "Dépôt récupéré avec succès",
      data: {
        reference,
        userId: indexData.userId,
        amount: failedEvent.amount,
        oldBalance,
        newBalance
      }
    });

  } catch (error) {
    console.error("[RECOVER_DEPOSITS] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET: Lister tous les événements échoués
export async function GET(request: Request) {
  try {
    console.log("[RECOVER_DEPOSITS] Liste des événements échoués");

    const failedEventsRef = adminDB.ref("failed_webhook_events");
    const snapshot = await failedEventsRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({
        success: true,
        events: []
      });
    }

    const events: any[] = [];
    snapshot.forEach((childSnapshot: any) => {
      events.push({
        reference: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    console.log("[RECOVER_DEPOSITS] Événements échoués:", events.length);

    return NextResponse.json({
      success: true,
      events
    });

  } catch (error) {
    console.error("[RECOVER_DEPOSITS] Erreur listing events:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
