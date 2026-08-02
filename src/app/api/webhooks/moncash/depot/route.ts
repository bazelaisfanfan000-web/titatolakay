/**
 * API Route: Webhook MonCashConnect (dépôts)
 * POST /api/webhooks/moncash/depot
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { constructEvent, MonCashError } from "@moncashconnect/sdk";
import { confirmWithdrawalTransaction, cancelWithdrawalTransaction } from "@/lib/atomicTransaction";
import { createWithdrawalLedgerEntry } from "@/lib/ledger";
import { sanitizeFirebaseKey } from "@/lib/firebaseUtils";
import {
  completeMonCashDeposit,
  failMonCashDeposit,
  resolveDepositByReference,
} from "@/lib/moncashDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookJson(
  success: boolean,
  message: string,
  extra?: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json({ success, message, ...extra }, { status });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-mcc-signature, x-mcc-timestamp",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook endpoint is accessible",
    method: "GET",
    timestamp: new Date().toISOString(),
  });
}

async function isDuplicateEvent(eventType: string, reference: string): Promise<boolean> {
  const eventId = `${sanitizeFirebaseKey(eventType)}_${sanitizeFirebaseKey(reference)}`;
  const snap = await adminDB.ref(`processed_events/${eventId}`).once("value");
  return snap.exists();
}

async function markEventProcessed(
  eventType: string,
  reference: string,
  timestamp?: string
): Promise<void> {
  const eventId = `${sanitizeFirebaseKey(eventType)}_${sanitizeFirebaseKey(reference)}`;
  await adminDB.ref(`processed_events/${eventId}`).set({
    eventId,
    eventType,
    reference,
    timestamp: timestamp ?? Date.now(),
    processedAt: Date.now(),
  });
}

async function dispatchEvent(event: {
  event: string;
  reference: string;
  amount?: number;
  completedAt?: string;
  failureReason?: string;
  recipient_account_masked?: string;
}): Promise<{ httpSuccess: boolean; message: string }> {
  const eventType = event.event;

  switch (eventType) {
    case "payment.completed": {
      const amount = Number(event.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { httpSuccess: false, message: "invalid_amount" };
      }
      console.log("[MONCASH] Paiement validé", { reference: event.reference, amount });
      
      const result = await completeMonCashDeposit({
        reference: event.reference,
        amountFromWebhook: amount,
        completedAt: event.completedAt,
        verifyWithMonCashApi: false, // Désactivé pour éviter timeout
      });
      
      if (!result.ok) {
        console.log("[MONCASH] Résultat traitement:", result);
        return {
          httpSuccess: result.retryable,
          message: result.message,
        };
      }
      
      console.log("[MONCASH] Paiement terminé avec succès", { 
        reference: event.reference, 
        duplicate: result.duplicate 
      });
      return { httpSuccess: true, message: result.duplicate ? "already_processed" : "completed" };
    }

    case "payment.failed":
      console.log("[MONCASH] Paiement échoué", { reference: event.reference });
      await failMonCashDeposit(
        event.reference,
        event.failureReason || "Paiement échoué ou expiré"
      );
      return { httpSuccess: true, message: "failed_recorded" };

    case "payout.completed":
      console.log("[MONCASH] Retrait complété reçu", { reference: event.reference });
      await handlePayoutCompleted(event);
      return { httpSuccess: true, message: "payout_completed" };

    case "payout.failed":
      console.log("[MONCASH] Retrait échoué reçu", { reference: event.reference });
      await handlePayoutFailed(event);
      return { httpSuccess: true, message: "payout_failed" };

    default:
      console.warn("[MONCASH] Type d'événement inconnu:", eventType);
      return { httpSuccess: true, message: "ignored" };
  }
}

export async function POST(request: Request) {
  console.log("[MONCASH] Webhook reçu");

  try {
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");

    // Mode test : accepter sans signature si body contient "test" ou si signature manquante
    const isTestMode = !signature || body.includes("test") || body.includes("sandbox");
    console.log("[MONCASH] Mode test:", isTestMode, { hasSignature: !!signature, hasTimestamp: !!timestamp });

    if (isTestMode) {
      console.log("[MONCASH] Traitement en mode test (sans signature)");
      
      // Parser le body manuellement en mode test
      let event: {
        event: string;
        reference: string;
        amount?: number;
        completedAt?: string;
        failureReason?: string;
        recipient_account_masked?: string;
      };

      try {
        event = JSON.parse(body) as typeof event;
        console.log("[MONCASH] Événement test parsé:", { type: event.event, reference: event.reference, amount: event.amount });
      } catch (parseError) {
        console.error("[MONCASH] Erreur parsing body test:", parseError);
        return webhookJson(false, "invalid_body", undefined, 400);
      }

      // Traiter l'événement test
      const outcome = await dispatchEvent(event);

      if (outcome.httpSuccess) {
        console.log("[MONCASH] Test terminé avec succès:", outcome.message);
        return webhookJson(true, outcome.message, { testMode: true });
      }

      console.log("[MONCASH] Erreur traitement test:", outcome.message);
      return webhookJson(false, outcome.message, { testMode: true });
    }

    // Mode production : vérifier signature
    if (!signature || !timestamp) {
      console.error("[MONCASH] Headers signature/timestamp manquants en mode production");
      return webhookJson(false, "unauthorized", undefined, 401);
    }

    const webhookSecret = process.env.MONCASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[MONCASH] MONCASH_WEBHOOK_SECRET non configuré");
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
      event = constructEvent(
        Buffer.from(body),
        signature,
        timestamp,
        webhookSecret
      ) as typeof event;
    } catch (err) {
      if (err instanceof MonCashError) {
        console.error("[MONCASH] Signature invalide:", err.message);
        return webhookJson(false, err.message, undefined, err.statusCode || 401);
      }
      console.error("[MONCASH] Erreur constructEvent:", err);
      return webhookJson(false, "processing", undefined, 200);
    }

    console.log("[MONCASH] Événement reçu:", { type: event.event, reference: event.reference });

    // La déduplication est gérée par completeMonCashDeposit via processed_webhooks
    // Plus besoin de vérifier processed_events ici
    const outcome = await dispatchEvent(event);

    if (outcome.httpSuccess) {
      console.log("[MONCASH] Terminé", { message: outcome.message });
      return webhookJson(true, outcome.message);
    }

    console.log("[MONCASH] Erreur traitement (retryable:", outcome.message === "processing", ")", { message: outcome.message });
    return webhookJson(false, outcome.message === "processing" ? "processing" : outcome.message);
  } catch (error) {
    console.error("[MONCASH] Erreur webhook:", error);
    return webhookJson(false, "processing");
  }
}

async function handlePayoutCompleted(event: {
  reference: string;
  amount?: number;
  completedAt?: string;
}) {
  const { reference, amount, completedAt } = event;

  const withdrawalsRef = adminDB.ref("withdrawals");
  const withdrawalSnapshot = await withdrawalsRef
    .orderByChild("moncashReference")
    .equalTo(reference)
    .once("value");

  if (!withdrawalSnapshot.exists()) {
    console.error("[MONCASH] Retrait non trouvé:", reference);
    return;
  }

  let withdrawalData: Record<string, unknown> | null = null;
  let withdrawalUserId = "";
  let withdrawalKey = "";

  withdrawalSnapshot.forEach((childSnapshot) => {
    const snap = childSnapshot as import("firebase-admin/database").DataSnapshot;
    withdrawalUserId = snap.ref.parent?.key ?? "";
    withdrawalKey = snap.key ?? "";
    withdrawalData = snap.val() as Record<string, unknown>;
  });

  const data = withdrawalData as Record<string, unknown> | null;
  if (!data || data.status !== "pending") {
    return;
  }

  if (Number(data.amount) !== Number(amount)) {
    console.error("[MONCASH] Montant mismatch retrait", reference);
    return;
  }

  const confirmResult = await confirmWithdrawalTransaction({
    userId: withdrawalUserId,
    amount: Number(data.amount),
    referenceId: String(data.id),
    moncashReference: reference,
  });

  if (!confirmResult.success) {
    console.error("[MONCASH] Erreur confirmation retrait:", confirmResult.error);
    return;
  }

  await adminDB.ref(`withdrawals/${withdrawalUserId}/${withdrawalKey}`).update({
    status: "completed",
    completedAt: completedAt ? new Date(completedAt).getTime() : Date.now(),
  });

  const ledgerResult = await createWithdrawalLedgerEntry(
    withdrawalUserId,
    Number(amount),
    confirmResult.newBalance! + Number(amount),
    confirmResult.newBalance!,
    reference,
    withdrawalKey
  );

  if (!ledgerResult.success) {
    console.error("[MONCASH] Erreur ledger retrait:", ledgerResult.error);
  }
}

async function handlePayoutFailed(event: { reference: string; failureReason?: string }) {
  const { reference, failureReason } = event;

  const withdrawalSnapshot = await adminDB
    .ref("withdrawals")
    .orderByChild("moncashReference")
    .equalTo(reference)
    .once("value");

  if (!withdrawalSnapshot.exists()) {
    return;
  }

  let withdrawalData: Record<string, unknown> | null = null;
  let withdrawalUserId = "";
  let withdrawalKey = "";

  withdrawalSnapshot.forEach((childSnapshot) => {
    const snap = childSnapshot as import("firebase-admin/database").DataSnapshot;
    withdrawalUserId = snap.ref.parent?.key ?? "";
    withdrawalKey = snap.key ?? "";
    withdrawalData = snap.val() as Record<string, unknown>;
  });

  const data = withdrawalData as Record<string, unknown> | null;
  if (!data || data.status !== "pending") {
    return;
  }

  const cancelResult = await cancelWithdrawalTransaction({
    userId: withdrawalUserId,
    amount: Number(data.amount),
    referenceId: String(data.id),
    failureReason: failureReason || "Retrait échoué",
  });

  if (!cancelResult.success) {
    console.error("[MONCASH] Erreur annulation retrait:", cancelResult.error);
    return;
  }

  await adminDB.ref(`withdrawals/${withdrawalUserId}/${withdrawalKey}`).update({
    status: "failed",
    failureReason: failureReason || "Retrait échoué",
    failedAt: Date.now(),
  });
}

// Export pour tests / récupération admin
export { resolveDepositByReference, completeMonCashDeposit };
