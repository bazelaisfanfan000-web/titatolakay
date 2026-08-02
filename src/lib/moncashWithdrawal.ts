/**
 * Retraits MonCash (payout) — index, idempotence webhook, finalisation / remboursement
 */

import crypto from "crypto";
import { adminDB } from "./firebaseAdmin";
import { sanitizeFirebaseKey } from "./firebaseUtils";
import { 
  claimProcessedWebhook, 
  releaseWebhookProcessing, 
  markWebhookProcessed,
  creditWalletWithRetry 
} from "./moncashDeposit";
import { confirmWithdrawalTransaction, cancelWithdrawalTransaction } from "./atomicTransaction";

export interface WithdrawalIndexEntry {
  userId: string;
  withdrawalId: string;
  referenceId?: string;
  moncashReference?: string;
  amount?: number;
  status: string;
  createdAt?: number;
}

export interface ResolvedWithdrawal {
  userId: string;
  withdrawalId: string;
  withdrawal: Record<string, unknown>;
  indexKey: string;
}

const ACTIVE_PAYOUT_STATUSES = new Set(["pending", "queued", "processing"]);

export function withdrawalIndexKeys(referenceId: string, moncashReference?: string): string[] {
  const keys = new Set<string>();
  keys.add(sanitizeFirebaseKey(referenceId));
  if (moncashReference) {
    keys.add(sanitizeFirebaseKey(moncashReference));
  }
  return [...keys];
}

export async function writeWithdrawalIndexEntries(
  referenceId: string,
  data: WithdrawalIndexEntry,
  moncashReference?: string
): Promise<void> {
  const keys = withdrawalIndexKeys(referenceId, moncashReference);
  const updates: Record<string, WithdrawalIndexEntry> = {};
  for (const key of keys) {
    updates[`withdrawal_index/${key}`] = {
      ...data,
      referenceId: data.referenceId ?? referenceId,
      moncashReference: moncashReference ?? data.moncashReference,
    };
  }
  await adminDB.ref().update(updates);
}

export async function resolveWithdrawalByReference(
  reference: string
): Promise<ResolvedWithdrawal | null> {
  console.log("[MONCASH] Recherche retrait par référence:", reference);
  
  const candidates = [sanitizeFirebaseKey(reference), reference].filter(
    (k, i, arr) => k && arr.indexOf(k) === i
  );

  for (const key of candidates) {
    console.log("[MONCASH] Tentative recherche dans withdrawal_index:", key);
    const indexSnap = await adminDB.ref(`withdrawal_index/${key}`).once("value");
    if (!indexSnap.exists()) {
      console.log("[MONCASH] Index retrait non trouvé pour:", key);
      continue;
    }

    const indexData = indexSnap.val() as WithdrawalIndexEntry;
    console.log("[MONCASH] Index retrait trouvé:", { 
      userId: indexData.userId, 
      withdrawalId: indexData.withdrawalId,
      status: indexData.status 
    });
    
    if (!indexData.userId || !indexData.withdrawalId) {
      console.error("[MONCASH] Index retrait invalide (userId ou withdrawalId manquant):", indexData);
      continue;
    }

    const withdrawalSnap = await adminDB
      .ref(`withdrawals/${indexData.userId}/${indexData.withdrawalId}`)
      .once("value");

    if (!withdrawalSnap.exists()) {
      console.error("[MONCASH] Retrait introuvable dans withdrawals:", {
        userId: indexData.userId,
        withdrawalId: indexData.withdrawalId
      });
      continue;
    }

    console.log("[MONCASH] Retrait trouvé:", {
      userId: indexData.userId,
      withdrawalId: indexData.withdrawalId,
      withdrawalData: withdrawalSnap.val()
    });

    return {
      userId: indexData.userId,
      withdrawalId: indexData.withdrawalId,
      withdrawal: withdrawalSnap.val(),
      indexKey: key,
    };
  }

  console.error("[MONCASH] Retrait non trouvé pour aucune des clés candidates:", candidates);
  return null;
}

async function updateWithdrawalIndexStatus(
  withdrawal: Record<string, unknown>,
  withdrawalId: string,
  webhookReference: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const indexUpdates: Record<string, unknown> = {};
  const completedAt = extra?.completedAt ?? Date.now();

  for (const key of withdrawalIndexKeys(
    String(withdrawal.referenceId ?? withdrawalId),
    withdrawal.moncashReference as string | undefined
  )) {
    indexUpdates[`withdrawal_index/${key}/status`] = status;
    if (status === "completed") {
      indexUpdates[`withdrawal_index/${key}/completedAt`] = completedAt;
    }
    if (status === "failed") {
      indexUpdates[`withdrawal_index/${key}/failedAt`] = completedAt;
    }
  }
  indexUpdates[`withdrawal_index/${sanitizeFirebaseKey(webhookReference)}/status`] = status;
  await adminDB.ref().update(indexUpdates);
}

export type CompleteWithdrawalResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; retryable: boolean; message: string };

/**
 * Webhook payout.completed — le solde a déjà été débité à la création du retrait.
 */
export async function completeMonCashWithdrawal(params: {
  reference: string;
  amountFromWebhook: number;
  completedAt?: string;
}): Promise<CompleteWithdrawalResult> {
  const { reference, amountFromWebhook, completedAt } = params;

  const claim = await claimProcessedWebhook(reference);
  if (claim.kind === "already_processed") {
    console.log("[MONCASH] Retrait déjà traité (processed_webhooks)", reference);
    return { ok: true, duplicate: true };
  }
  if (claim.kind === "contention") {
    return { ok: false, retryable: true, message: "processing" };
  }

  try {
    const resolved = await resolveWithdrawalByReference(reference);
    if (!resolved) {
      console.error("[MONCASH] Retrait — référence inconnue", reference);
      await adminDB.ref(`failed_webhook_events/${sanitizeFirebaseKey(reference)}`).set({
        event: "payout.completed",
        reference,
        amount: amountFromWebhook,
        receivedAt: Date.now(),
        reason: "withdrawal_not_found",
      });
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "unknown_reference" };
    }

    console.log("[MONCASH] Reference retrait trouvée", {
      reference,
      userId: resolved.userId,
      withdrawalId: resolved.withdrawalId,
    });

    const withdrawal = resolved.withdrawal;
    const status = String(withdrawal.status ?? "");
    const expectedAmount = Number(withdrawal.amount);

    if (status === "completed") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    if (status === "failed") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    if (!ACTIVE_PAYOUT_STATUSES.has(status)) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "invalid_withdrawal_status" };
    }

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "invalid_withdrawal_amount" };
    }

    if (Number(amountFromWebhook) !== expectedAmount) {
      console.error("[MONCASH] Montant retrait mismatch", {
        expected: expectedAmount,
        received: amountFromWebhook,
        reference,
      });
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "amount_mismatch" };
    }

    const internalReferenceId = String(withdrawal.referenceId ?? withdrawal.id ?? resolved.withdrawalId);

    const confirmResult = await confirmWithdrawalTransaction({
      userId: resolved.userId,
      amount: expectedAmount,
      referenceId: internalReferenceId,
      moncashReference: reference,
    });

    if (!confirmResult.success) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: true, message: "processing" };
    }

    const completedAtMs = completedAt ? new Date(completedAt).getTime() : Date.now();
    await updateWithdrawalIndexStatus(withdrawal, resolved.withdrawalId, reference, "completed", {
      completedAt: completedAtMs,
    });

    await markWebhookProcessed(reference);
    console.log("[MONCASH] Retrait terminé", { reference, userId: resolved.userId });

    return { ok: true, duplicate: false };
  } catch (err) {
    console.error("[MONCASH] Erreur completeMonCashWithdrawal", err);
    await releaseWebhookProcessing(reference);
    return { ok: false, retryable: true, message: "processing" };
  }
}

export async function failMonCashWithdrawal(
  reference: string,
  failureReason: string
): Promise<CompleteWithdrawalResult> {
  const claim = await claimProcessedWebhook(reference);
  if (claim.kind === "already_processed") {
    return { ok: true, duplicate: true };
  }
  if (claim.kind === "contention") {
    return { ok: false, retryable: true, message: "processing" };
  }

  try {
    const resolved = await resolveWithdrawalByReference(reference);
    if (!resolved) {
      console.warn("[MONCASH] payout.failed — référence inconnue", reference);
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "unknown_reference" };
    }

    const withdrawal = resolved.withdrawal;
    const status = String(withdrawal.status ?? "");

    if (status === "failed") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    if (status === "completed") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    if (!ACTIVE_PAYOUT_STATUSES.has(status)) {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    const amount = Number(withdrawal.amount);
    const internalReferenceId = String(withdrawal.referenceId ?? withdrawal.id ?? resolved.withdrawalId);

    const cancelResult = await cancelWithdrawalTransaction({
      userId: resolved.userId,
      amount,
      referenceId: internalReferenceId,
      failureReason,
    });

    if (!cancelResult.success) {
      const refund = await creditWalletWithRetry(resolved.userId, amount);
      if (!refund.success) {
        await releaseWebhookProcessing(reference);
        return { ok: false, retryable: true, message: "processing" };
      }
    }

    await adminDB.ref(`withdrawals/${resolved.userId}/${resolved.withdrawalId}`).update({
      status: "failed",
      failureReason,
      failedAt: Date.now(),
    });

    await updateWithdrawalIndexStatus(withdrawal, resolved.withdrawalId, reference, "failed");

    await markWebhookProcessed(reference);
    console.log("[MONCASH] Retrait échoué + remboursement", {
      reference,
      userId: resolved.userId,
    });

    return { ok: true, duplicate: false };
  } catch (err) {
    console.error("[MONCASH] Erreur failMonCashWithdrawal", err);
    await releaseWebhookProcessing(reference);
    return { ok: false, retryable: true, message: "processing" };
  }
}
