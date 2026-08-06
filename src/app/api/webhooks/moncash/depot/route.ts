/**
 * API Route: Webhook MonCashConnect (dépôts)
 * POST /api/webhooks/moncash/depot
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { constructEvent, MonCashError } from "@moncashconnect/sdk";
import { sanitizeFirebaseKey } from "@/lib/firebaseUtils";
import {
  completeMonCashDeposit,
  failMonCashDeposit,
  resolveDepositByReference,
} from "@/lib/moncashDeposit";
import {
  findWithdrawalByPayoutReference,
  updateWithdrawalStatus,
} from "@/lib/firebase/withdrawal";
import { creditWallet } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// [FIX] Ajout du paramètre 'status' pour contrôler le code HTTP
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

// [FIX] Ces fonctions ne sont plus utilisées (déduplication gérée par processed_webhooks)
// Mais on les garde pour compatibilité (elles ne sont pas appelées)
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

// [FIX] Correction : Ajout du flag retryable dans le type de retour
async function dispatchEvent(event: {
  event: string;
  reference: string;
  amount?: number;
  completedAt?: string;
  failureReason?: string;
  recipient_account_masked?: string;
}): Promise<{ httpSuccess: boolean; message: string; retryable?: boolean }> {
  const eventType = event.event;

  switch (eventType) {
    case "payment.completed": {
      const amount = Number(event.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { httpSuccess: false, message: "invalid_amount", retryable: false };
      }
      console.log("[MONCASH] Paiement validé", { reference: event.reference });
      
      const result = await completeMonCashDeposit({
        reference: event.reference,
        amountFromWebhook: amount,
        completedAt: event.completedAt,
        verifyWithMonCashApi: true,
      });
      
      if (!result.ok) {
        console.log("[MONCASH] Résultat traitement:", result);
        // On propage le retryable depuis le résultat
        return {
          httpSuccess: false, // On force à false pour les erreurs
          message: result.message,
          retryable: result.retryable, // important
        };
      }
      
      console.log("[MONCASH] Paiement terminé avec succès", { 
        reference: event.reference, 
        duplicate: result.duplicate 
      });
      return { 
        httpSuccess: true, 
        message: result.duplicate ? "already_processed" : "completed",
        retryable: false
      };
    }

    case "payment.failed":
      console.log("[MONCASH] Paiement échoué", { reference: event.reference });
      await failMonCashDeposit(
        event.reference,
        event.failureReason || "Paiement échoué ou expiré"
      );
      return { httpSuccess: true, message: "failed_recorded", retryable: false };

    case "payout.completed":
      console.log("[MONCASH] Payout complété reçu:", { reference: event.reference });
      await handlePayoutCompleted(event);
      return { httpSuccess: true, message: "payout_completed", retryable: false };

    case "payout.failed":
      console.log("[MONCASH] Payout échoué reçu:", { reference: event.reference });
      await handlePayoutFailed(event);
      return { httpSuccess: true, message: "payout_failed", retryable: false };

    default:
      console.warn("[MONCASH] Type d'événement inconnu:", eventType);
      return { httpSuccess: true, message: "ignored", retryable: false };
  }
}

export async function POST(request: Request) {
  console.log("[MONCASH] Webhook reçu");

  try {
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");

    // Vérification IP
    const allowedWebhookIPs = process.env.MONCASH_WEBHOOK_IPS?.split(",") || [];
    if (allowedWebhookIPs.length > 0) {
      const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const isAllowed = allowedWebhookIPs.some(allowedIP => clientIP.includes(allowedIP.trim()));
      if (!isAllowed) {
        console.error("[MONCASH] IP non autorisée:", clientIP);
        return webhookJson(false, "unauthorized", undefined, 401);
      }
    }

    // Vérification signature
    if (!signature || !timestamp) {
      console.error("[MONCASH] Headers signature/timestamp manquants");
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

    // Traitement
    const outcome = await dispatchEvent(event);

    // [FIX] Correction N°1 : Gestion des codes HTTP selon retryable
    if (outcome.httpSuccess) {
      console.log("[MONCASH] Terminé avec succès", { message: outcome.message });
      return webhookJson(true, outcome.message);
    } else {
      // Erreur : on vérifie si elle est récupérable
      if (outcome.retryable === true) {
        console.warn("[MONCASH] Erreur récupérable, renvoi 500 pour réessai", { message: outcome.message });
        return webhookJson(false, outcome.message, undefined, 500);
      } else {
        // Erreur définitive (ex: unknown_reference, amount_mismatch)
        console.error("[MONCASH] Erreur définitive, renvoi 200 pour ne pas réessayer", { message: outcome.message });
        return webhookJson(false, outcome.message, undefined, 200);
      }
    }
  } catch (error) {
    console.error("[MONCASH] Erreur webhook (non gérée):", error);
    // En cas d'erreur inattendue, on renvoie 500 pour que MonCash réessaie
    return webhookJson(false, "internal_error", undefined, 500);
  }
}

// Export pour tests / récupération admin
export { resolveDepositByReference, completeMonCashDeposit };

/**
 * Handler pour payout.completed
 * Le retrait a réussi, on met à jour le statut
 */
async function handlePayoutCompleted(event: {
  reference: string;
  amount?: number;
  completedAt?: string;
}) {
  const { reference, amount, completedAt } = event;

  console.log("[PAYOUT] Traitement payout.completed:", { reference, amount });

  const withdrawal = await findWithdrawalByPayoutReference(reference);
  
  if (!withdrawal) {
    console.error("[PAYOUT] Retrait non trouvé pour référence:", reference);
    return;
  }

  const { userId, withdrawalId, withdrawal: withdrawalData } = withdrawal;

  if (withdrawalData.status !== "pending") {
    console.log("[PAYOUT] Retrait déjà traité:", withdrawalData.status);
    return;
  }

  // [FIX] Utilisation d'une tolérance pour la comparaison des montants
  if (amount && Math.abs(Number(amount) - withdrawalData.amount) > 0.01) {
    console.error("[PAYOUT] Montant mismatch (tolérance dépassée):", {
      expected: withdrawalData.amount,
      received: amount,
    });
    return;
  }

  await updateWithdrawalStatus(userId, withdrawalId, "completed", {
    completedAt: completedAt ? new Date(completedAt).getTime() : Date.now(),
  });

  console.log("[PAYOUT] Retrait marqué comme completed:", { userId, withdrawalId });
}

/**
 * Handler pour payout.failed
 * Le retrait a échoué, on recrédite le solde
 */
async function handlePayoutFailed(event: {
  reference: string;
  amount?: number;
  failureReason?: string;
}) {
  const { reference, amount, failureReason } = event;

  console.log("[PAYOUT] Traitement payout.failed:", { reference, amount, failureReason });

  const withdrawal = await findWithdrawalByPayoutReference(reference);
  
  if (!withdrawal) {
    console.error("[PAYOUT] Retrait non trouvé pour référence:", reference);
    return;
  }

  const { userId, withdrawalId, withdrawal: withdrawalData } = withdrawal;

  if (withdrawalData.status !== "pending") {
    console.log("[PAYOUT] Retrait déjà traité:", withdrawalData.status);
    return;
  }

  console.log("[PAYOUT] Recrédit du solde:", { userId, amount: withdrawalData.amount });
  const creditResult = await creditWallet(userId, withdrawalData.amount, reference);

  if (!creditResult.success) {
    console.error("[PAYOUT] CRITICAL: Recrédit échoué!", creditResult.error);
    // [FIX] Placeholder pour alerte (Slack/Discord/Email)
    // try {
    //   await fetch(process.env.SLACK_WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       text: `🚨 CRITICAL: Échec recrédit pour retrait ${reference}, userId=${userId}`
    //     })
    //   });
    // } catch (alertErr) { /* ignore */ }
    return;
  }

  console.log("[PAYOUT] Solde recrédité avec succès:", creditResult);

  await updateWithdrawalStatus(userId, withdrawalId, "failed", {
    failedAt: Date.now(),
    failureReason: failureReason || "Payout échoué",
    error: failureReason || "Payout échoué",
  });

  console.log("[PAYOUT] Retrait marqué comme failed:", { userId, withdrawalId });
}