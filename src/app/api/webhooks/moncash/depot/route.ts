/**
 * API Route: Webhook MonCashConnect
 * POST /api/webhooks/moncash/depot
 * Gère les événements payment.completed, payment.failed, payout.completed, payout.failed
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { constructEvent, MonCashError } from "@moncashconnect/sdk";
import { confirmWithdrawalTransaction, cancelWithdrawalTransaction } from "@/lib/atomicTransaction";
import { creditWallet } from "@/lib/wallet";
import { createDepositLedgerEntry, createWithdrawalLedgerEntry, updateLedgerStatus } from "@/lib/ledger";
import { sanitizeFirebaseKey } from "@/lib/firebaseUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Handler OPTIONS pour CORS preflight
export async function OPTIONS(request: Request) {
  console.log("[WEBHOOK] OPTIONS request received");
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-mcc-signature, x-mcc-timestamp',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// Handler GET pour tester l'accessibilité de l'endpoint
export async function GET(request: Request) {
  console.log("[WEBHOOK] GET request received");
  return NextResponse.json({
    message: "Webhook endpoint is accessible",
    method: "GET",
    note: "MonCashConnect should send POST requests to this endpoint",
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  console.log("[WEBHOOK] POST request received");
  
  try {
    // 1. Lire le corps brut pour vérifier la signature
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");
    const contentType = request.headers.get("content-type");
    const userAgent = request.headers.get("user-agent");

    console.log("[WEBHOOK] Headers reçus:", {
      signature: signature ? `${signature.substring(0, 20)}...` : 'missing',
      timestamp,
      contentType,
      userAgent,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
      nodeEnv: process.env.NODE_ENV
    });

    // Mode test: si signature absente OU si le corps contient "test"
    // NE PAS dépendre de NODE_ENV car Vercel est en production
    const isTestMode = !signature || body.includes('test');
    
    console.log("[WEBHOOK] Détection mode test:", {
      isTestMode,
      hasSignature: !!signature,
      bodyContainsTest: body.includes('test'),
      nodeEnv: process.env.NODE_ENV
    });
    
    if (isTestMode) {
      console.log("[WEBHOOK] Mode test détecté - retour 200 sans traitement");
      // En mode test, retourner immédiatement 200 sans traiter l'événement
      return NextResponse.json({ 
        success: true, 
        testMode: true,
        message: "Test webhook reçu - endpoint fonctionnel."
      });
    }

    if (!signature || !timestamp) {
      console.error("[WEBHOOK] Headers manquants");
      return NextResponse.json(
        { error: "Headers manquants" },
        { status: 400 }
      );
    }

    // 2. Vérifier la signature et construire l'événement avec le SDK officiel
    const webhookSecret = process.env.MONCASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[WEBHOOK] MONCASH_WEBHOOK_SECRET non configuré");
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    let event: any;
    try {
      event = constructEvent(
        Buffer.from(body),
        signature,
        timestamp,
        webhookSecret
      );
    } catch (err) {
      if (err instanceof MonCashError) {
        console.error("[WEBHOOK] Erreur SDK MonCash:", err.message);
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode || 401 }
        );
      }
      console.error("[WEBHOOK] Erreur inconnue:", err);
      return NextResponse.json(
        { error: "Erreur lors du traitement" },
        { status: 500 }
      );
    }

    console.log("[WEBHOOK] Événement reçu:", event);

    // 3. Vérifier la déduplication (anti-replay)
    // Utiliser seulement event.reference qui est unique, pas le timestamp
    const safeEventType = sanitizeFirebaseKey(event.event);
    const safeReference = sanitizeFirebaseKey(event.reference);
    const eventId = `${safeEventType}_${safeReference}`;
    const processedEventRef = adminDB.ref(`processed_events/${eventId}`);
    const processedSnapshot = await processedEventRef.once("value");

    if (processedSnapshot.exists()) {
      console.log("[WEBHOOK] Événement déjà traité:", eventId);
      return NextResponse.json({ success: true, message: "Déjà traité" });
    }

    // 4. Traiter l'événement selon son type
    const eventType = event.event as string;
    let processingSuccess = false;
    
    try {
      switch (eventType) {
        case "payment.completed":
          await handlePaymentCompleted(event);
          processingSuccess = true;
          break;

        case "payment.failed":
          await handlePaymentFailed(event);
          processingSuccess = true;
          break;

        case "payout.completed":
          await handlePayoutCompleted(event);
          processingSuccess = true;
          break;

        case "payout.failed":
          await handlePayoutFailed(event);
          processingSuccess = true;
          break;

        default:
          console.warn("[WEBHOOK] Type d'événement inconnu:", eventType);
          break;
      }
    } finally {
      // 5. Marquer l'événement comme traité APRÈS le traitement (évite race condition)
      if (processingSuccess) {
        await processedEventRef.set({
          eventId,
          eventType: event.event,
          reference: event.reference,
          timestamp,
          processedAt: Date.now()
        });
      }
    }
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[WEBHOOK] Erreur:", error);

    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}

/**
 * Gère payment.completed - Crédite le wallet
 */
async function handlePaymentCompleted(event: any) {
  try {
    const { reference, amount, completedAt } = event;

    console.log("[WEBHOOK] Payment completed:", { reference, amount });

    let depositData: any = null;
    let depositUserId: string = "";
    let depositKey: string = "";

    // Méthode 1: Rechercher par moncashReference
    const depositsRef = adminDB.ref("deposits");
    const depositSnapshot = await depositsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    console.log("[WEBHOOK] Recherche par moncashReference:", depositSnapshot.exists());

    if (depositSnapshot.exists()) {
      depositSnapshot.forEach((child: any) => {
        depositData = child.val();
        depositKey = child.key;
        depositUserId = child.ref.parent.key || depositData.userId || "";
      });
      console.log("[WEBHOOK] Dépôt trouvé via moncashReference:", { depositKey, depositUserId });
    }

    // Méthode 2: Si non trouvé, rechercher par referenceId (fallback)
    if (!depositData) {
      console.log("[WEBHOOK] Recherche par referenceId (fallback)");
      const depositSnapshot2 = await depositsRef
        .orderByChild("id")
        .equalTo(reference)
        .once("value");

      console.log("[WEBHOOK] Recherche par referenceId:", depositSnapshot2.exists());

      if (depositSnapshot2.exists()) {
        depositSnapshot2.forEach((child: any) => {
          depositData = child.val();
          depositKey = child.key;
          depositUserId = child.ref.parent.key || depositData.userId || "";
        });
        console.log("[WEBHOOK] Dépôt trouvé via referenceId:", { depositKey, depositUserId });
      }
    }

    if (!depositData) {
      console.log("[WEBHOOK] Dépôt non trouvé (normal en mode test):", reference);
      return;
    }

    console.log("[WEBHOOK] Deposit found:", {
      depositKey,
      depositUserId,
      depositData,
      hasUserId: !!depositUserId
    });

    // Si depositUserId est vide, essayer de le récupérer depuis depositData
    if (!depositUserId && depositData.userId) {
      depositUserId = depositData.userId;
      console.log("[WEBHOOK] Using userId from depositData:", depositUserId);
    }

    if (!depositUserId) {
      console.error("[WEBHOOK] Impossible de récupérer l'userId:", { depositKey, depositData });
      return;
    }

    // Vérifier que le dépôt est en pending (sécurité)
    if (depositData.status !== "pending") {
      console.log("[WEBHOOK] Dépôt n'est pas en pending (déjà traité):", { reference, status: depositData.status });
      return;
    }

    // Vérifier que le montant correspond au montant original
    if (depositData.amount !== amount) {
      console.error("[WEBHOOK] Montant mismatch:", {
        expected: depositData.amount,
        received: amount,
        reference
      });
      return;
    }

    console.log("[WEBHOOK] Tentative de crédit wallet:", { depositUserId, amount, reference });

    // Transaction atomique: crédit wallet + update dépôt
    const depositRef = adminDB.ref(`deposits/${depositUserId}/${depositData.id}`);
    
    const result = await adminDB.ref(`users/${depositUserId}`).transaction((current: any) => {
      if (!current) {
        return; // Annuler si wallet n'existe pas
      }
      return {
        ...current,
        balance: Number(current.balance || 0) + amount,
        updatedAt: Date.now()
      };
    });

    if (!result.committed) {
      console.error("[WEBHOOK] Transaction atomique échouée");
      return;
    }

    const newBalance = result.snapshot.val()?.balance || 0;
    console.log("[WEBHOOK] Crédit atomique réussi:", { depositUserId, amount, newBalance });

    // Mettre à jour le dépôt (après transaction réussie)
    await depositRef.update({
      status: "completed",
      moncashTransactionId: reference,
      netAmount: amount,
      completedAt: new Date(completedAt).getTime()
    });

    // Créer l'entrée ledger
    await createDepositLedgerEntry(
      depositUserId,
      amount,
      newBalance - amount,
      newBalance,
      reference,
      depositData.id
    );

    console.log("[WEBHOOK] Payment complété avec succès:", { reference, userId: depositUserId, newBalance });
  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePaymentCompleted:", error);
    throw error;
  }
}

/**
 * Gère payment.failed - Marque le dépôt comme échoué
 */
async function handlePaymentFailed(event: any) {
  try {
    const { reference } = event;

    console.log("[WEBHOOK] Payment failed:", { reference });

    let depositData: any = null;
    let depositUserId: string = "";
    let depositKey: string = "";

    // Méthode 1: Rechercher par moncashReference
    const depositsRef = adminDB.ref("deposits");
    const depositSnapshot = await depositsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    if (depositSnapshot.exists()) {
      depositSnapshot.forEach((child: any) => {
        depositData = child.val();
        depositKey = child.key;
        depositUserId = child.ref.parent.key || depositData.userId || "";
      });
    }

    // Méthode 2: Fallback par referenceId
    if (!depositData) {
      const depositSnapshot2 = await depositsRef
        .orderByChild("id")
        .equalTo(reference)
        .once("value");

      if (depositSnapshot2.exists()) {
        depositSnapshot2.forEach((child: any) => {
          depositData = child.val();
          depositKey = child.key;
          depositUserId = child.ref.parent.key || depositData.userId || "";
        });
      }
    }

    if (!depositData) {
      console.log("[WEBHOOK] Dépôt non trouvé (normal en mode test):", reference);
      return;
    }

    // Vérifier que le dépôt est en pending (sécurité)
    if (depositData.status !== "pending") {
      console.log("[WEBHOOK] Dépôt n'est pas en pending (déjà traité):", { reference, status: depositData.status });
      return;
    }

    // Si le dépôt est déjà échoué, ne rien faire
    if (depositData.status === "failed") {
      console.log("[WEBHOOK] Dépôt déjà échoué:", reference);
      return;
    }

    // Mettre à jour le dépôt
    const depositRef = adminDB.ref(`deposits/${depositUserId}/${depositData.id}`);
    await depositRef.update({
      status: "failed",
      failureReason: "Paiement échoué ou expiré",
      failedAt: Date.now()
    });

    console.log("[WEBHOOK] Payment marqué comme échoué:", { reference });
  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePaymentFailed:", error);
    throw error;
  }
}

/**
 * Gère payout.completed - Confirme le retrait
 */
async function handlePayoutCompleted(event: any) {
  try {
    const { reference, amount, completedAt, recipient_account_masked } = event;

    console.log("[WEBHOOK] Payout completed:", { reference, amount });

    // Trouver le retrait correspondant
    const withdrawalsRef = adminDB.ref("withdrawals");
    const withdrawalSnapshot = await withdrawalsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    if (!withdrawalSnapshot.exists()) {
      console.log("[WEBHOOK] Retrait non trouvé (normal en mode test):", reference);
      return;
    }

    let withdrawalData: any = null;
    let withdrawalUserId: string = "";

    withdrawalSnapshot.forEach((child: any) => {
      withdrawalData = child.val();
      withdrawalUserId = child.ref.parent.key; // L'userId (parent du retrait)
    });

    // Vérifier que le retrait est en pending (sécurité)
    if (withdrawalData.status !== "pending") {
      console.log("[WEBHOOK] Retrait n'est pas en pending (déjà traité):", { reference, status: withdrawalData.status });
      return;
    }

    // Si le retrait est déjà complété, ne rien faire
    if (withdrawalData.status === "completed") {
      console.log("[WEBHOOK] Retrait déjà complété:", reference);
      return;
    }

    // Vérifier que le montant correspond au montant original
    if (withdrawalData.amount !== amount) {
      console.error("[WEBHOOK] Montant mismatch retrait:", {
        expected: withdrawalData.amount,
        received: amount,
        reference
      });
      return;
    }

    // Confirmer le retrait (débit + déverrouillage)
    const confirmResult = await confirmWithdrawalTransaction({
      userId: withdrawalUserId,
      amount: withdrawalData.amount,
      referenceId: withdrawalData.id,
      moncashReference: reference
    });

    if (!confirmResult.success) {
      console.error("[WEBHOOK] Erreur confirmation retrait:", confirmResult.error);
      return;
    }

    // Mettre à jour le retrait
    const withdrawalRef = adminDB.ref(`withdrawals/${withdrawalUserId}/${withdrawalData.id}`);
    await withdrawalRef.update({
      status: "completed",
      completedAt: new Date(completedAt).getTime()
    });

    // Créer l'entrée ledger
    await createWithdrawalLedgerEntry(
      withdrawalUserId,
      amount,
      confirmResult.newBalance! + amount,
      confirmResult.newBalance!,
      reference,
      withdrawalData.id
    );

    console.log("[WEBHOOK] Payout complété avec succès:", { reference, userId: withdrawalUserId });
  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePayoutCompleted:", error);
    throw error;
  }
}

/**
 * Gère payout.failed - Annule le retrait et déverrouille
 */
async function handlePayoutFailed(event: any) {
  try {
    const { reference, failureReason } = event;

    console.log("[WEBHOOK] Payout failed:", { reference, failureReason });

    // Trouver le retrait correspondant
    const withdrawalsRef = adminDB.ref("withdrawals");
    const withdrawalSnapshot = await withdrawalsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    if (!withdrawalSnapshot.exists()) {
      console.log("[WEBHOOK] Retrait non trouvé (normal en mode test):", reference);
      return;
    }

    let withdrawalData: any = null;
    let withdrawalUserId: string = "";

    withdrawalSnapshot.forEach((child: any) => {
      withdrawalData = child.val();
      withdrawalUserId = child.ref.parent.key; // L'userId (parent du retrait)
    });

    // Vérifier que le retrait est en pending (sécurité)
    if (withdrawalData.status !== "pending") {
      console.log("[WEBHOOK] Retrait n'est pas en pending (déjà traité):", { reference, status: withdrawalData.status });
      return;
    }

    // Si le retrait est déjà échoué, ne rien faire
    if (withdrawalData.status === "failed") {
      console.log("[WEBHOOK] Retrait déjà échoué:", reference);
      return;
    }

    // Annuler le retrait (déverrouillage sans débit)
    const cancelResult = await cancelWithdrawalTransaction({
      userId: withdrawalUserId,
      amount: withdrawalData.amount,
      referenceId: withdrawalData.id,
      failureReason: failureReason || "Retrait échoué"
    });

    if (!cancelResult.success) {
      console.error("[WEBHOOK] Erreur annulation retrait:", cancelResult.error);
      return;
    }

    console.log("[WEBHOOK] Payout annulé avec succès:", { reference, userId: withdrawalUserId });
  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePayoutFailed:", error);
    throw error;
  }
}
