/**
 * API Route: Webhook MonCashConnect
 * POST /api/webhooks/moncash
 * Gère les événements payment.completed, payment.failed, payout.completed, payout.failed
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { parseWebhook } from "@/lib/moncash";
import { confirmWithdrawalTransaction, cancelWithdrawalTransaction } from "@/lib/atomicTransaction";
import { creditWallet } from "@/lib/wallet";
import { createDepositLedgerEntry, createWithdrawalLedgerEntry, updateLedgerStatus } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Lire le corps brut pour vérifier la signature
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");

    if (!signature || !timestamp) {
      console.error("[WEBHOOK] Headers manquants");
      return NextResponse.json(
        { error: "Headers manquants" },
        { status: 400 }
      );
    }

    // 2. Vérifier la signature HMAC
    const event = parseWebhook(body, signature, timestamp);
    if (!event) {
      console.error("[WEBHOOK] Signature invalide");
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 }
      );
    }

    console.log("[WEBHOOK] Événement reçu:", event);

    // 3. Vérifier la déduplication (anti-replay)
    // Utiliser seulement event.reference qui est unique, pas le timestamp
    const eventId = `${event.event}_${event.reference}`;
    const processedEventRef = adminDB.ref(`processed_events/${eventId}`);
    const processedSnapshot = await processedEventRef.once("value");

    if (processedSnapshot.exists()) {
      console.log("[WEBHOOK] Événement déjà traité:", eventId);
      return NextResponse.json({ success: true, message: "Déjà traité" });
    }

    // 4. Marquer l'événement comme traité (avant le traitement pour éviter les doublons)
    await processedEventRef.set({
      eventId,
      eventType: event.event,
      reference: event.reference,
      timestamp,
      processedAt: Date.now()
    });

    // 5. Traiter l'événement selon son type
    switch (event.event) {
      case "payment.completed":
        await handlePaymentCompleted(event);
        break;

      case "payment.failed":
        await handlePaymentFailed(event);
        break;

      case "payout.completed":
        await handlePayoutCompleted(event);
        break;

      case "payout.failed":
        await handlePayoutFailed(event);
        break;

      default:
        console.warn("[WEBHOOK] Type d'événement inconnu:", event.event);
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

  // Méthode 3: Si toujours non trouvé, parcourir tous les dépôts (dernier recours)
  if (!depositData) {
    console.log("[WEBHOOK] Recherche exhaustive (dernier recours)");
    const allDepositsSnapshot = await depositsRef.once("value");
    
    if (allDepositsSnapshot.exists()) {
      allDepositsSnapshot.forEach((userSnapshot: any) => {
        const userId = userSnapshot.key;
        const userDeposits = userSnapshot.val();
        
        Object.entries(userDeposits).forEach(([depId, depData]: [string, any]) => {
          if (!depositData && (depData.moncashReference === reference || depData.id === reference)) {
            depositData = depData;
            depositKey = depId;
            depositUserId = userId;
            console.log("[WEBHOOK] Dépôt trouvé via recherche exhaustive:", { depositKey, depositUserId });
          }
        });
      });
    }
  }

  if (!depositData) {
    console.error("[WEBHOOK] Dépôt non trouvé après toutes les méthodes:", reference);
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

  // Si le dépôt est déjà complété, ne rien faire
  if (depositData.status === "completed") {
    console.log("[WEBHOOK] Dépôt déjà complété:", reference);
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

  // Créditer le wallet
  const creditResult = await creditWallet(
    depositUserId,
    amount,
    reference,
    "Dépôt MonCash complété"
  );

  console.log("[WEBHOOK] Résultat crédit wallet:", creditResult);

  if (!creditResult.success) {
    console.error("[WEBHOOK] Erreur crédit wallet:", creditResult.error);
    return;
  }

  // Mettre à jour le dépôt
  const depositRef = adminDB.ref(`deposits/${depositUserId}/${depositData.id}`);
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
    creditResult.balance! - amount,
    creditResult.balance!,
    reference,
    depositData.id
  );

  console.log("[WEBHOOK] Payment complété avec succès:", { reference, userId: depositUserId, newBalance: creditResult.balance });
}

/**
 * Gère payment.failed - Marque le dépôt comme échoué
 */
async function handlePaymentFailed(event: any) {
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

  // Méthode 3: Recherche exhaustive
  if (!depositData) {
    const allDepositsSnapshot = await depositsRef.once("value");
    
    if (allDepositsSnapshot.exists()) {
      allDepositsSnapshot.forEach((userSnapshot: any) => {
        const userId = userSnapshot.key;
        const userDeposits = userSnapshot.val();
        
        Object.entries(userDeposits).forEach(([depId, depData]: [string, any]) => {
          if (!depositData && (depData.moncashReference === reference || depData.id === reference)) {
            depositData = depData;
            depositKey = depId;
            depositUserId = userId;
          }
        });
      });
    }
  }

  if (!depositData) {
    console.error("[WEBHOOK] Dépôt non trouvé:", reference);
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
}

/**
 * Gère payout.completed - Confirme le retrait
 */
async function handlePayoutCompleted(event: any) {
  const { reference, amount, completedAt, recipient_account_masked } = event;

  console.log("[WEBHOOK] Payout completed:", { reference, amount });

  // Trouver le retrait correspondant
  const withdrawalsRef = adminDB.ref("withdrawals");
  const withdrawalSnapshot = await withdrawalsRef
    .orderByChild("moncashReference")
    .equalTo(reference)
    .once("value");

  if (!withdrawalSnapshot.exists()) {
    console.error("[WEBHOOK] Retrait non trouvé:", reference);
    return;
  }

  let withdrawalData: any = null;
  let withdrawalUserId: string = "";

  withdrawalSnapshot.forEach((child: any) => {
    withdrawalData = child.val();
    withdrawalUserId = child.ref.parent.key; // L'userId (parent du retrait)
  });

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
}

/**
 * Gère payout.failed - Annule le retrait et déverrouille
 */
async function handlePayoutFailed(event: any) {
  const { reference, failureReason } = event;

  console.log("[WEBHOOK] Payout failed:", { reference, failureReason });

  // Trouver le retrait correspondant
  const withdrawalsRef = adminDB.ref("withdrawals");
  const withdrawalSnapshot = await withdrawalsRef
    .orderByChild("moncashReference")
    .equalTo(reference)
    .once("value");

  if (!withdrawalSnapshot.exists()) {
    console.error("[WEBHOOK] Retrait non trouvé:", reference);
    return;
  }

  let withdrawalData: any = null;
  let withdrawalUserId: string = "";

  withdrawalSnapshot.forEach((child: any) => {
    withdrawalData = child.val();
    withdrawalUserId = child.ref.parent.key; // L'userId (parent du retrait)
  });

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
}
