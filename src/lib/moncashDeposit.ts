/**
 * Dépôts MonCash — résolution par index, idempotence webhook, crédit atomique
 */

import crypto from "crypto";
import { adminDB } from "./firebaseAdmin";
import { sanitizeFirebaseKey } from "./firebaseUtils";
import { getPaymentStatus } from "./moncash";
import { createDepositLedgerEntry } from "./ledger";

const MAX_TX_RETRIES = 5;
const TX_RETRY_DELAY_MS = 150;

// [FIX] Correction N°2 : Augmentation du timeout du lock de 120s à 600s (10 minutes)
const LOCK_TIMEOUT_MS = 600_000; // 10 minutes

export interface DepositIndexEntry {
  userId: string;
  depositId: string;
  referenceId?: string;
  moncashReference?: string;
  amount?: number;
  netAmount?: number;
  status: string;
  createdAt?: number;
}

export interface ResolvedDeposit {
  userId: string;
  depositId: string;
  deposit: Record<string, unknown>;
  indexKey: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clés d'index à maintenir pour une même transaction (referenceId + ref MonCash si différente).
 */
export function depositIndexKeys(referenceId: string, moncashReference?: string): string[] {
  const keys = new Set<string>();
  keys.add(sanitizeFirebaseKey(referenceId));
  if (moncashReference) {
    keys.add(sanitizeFirebaseKey(moncashReference));
  }
  return [...keys];
}

export async function writeDepositIndexEntries(
  referenceId: string,
  data: DepositIndexEntry,
  moncashReference?: string
): Promise<void> {
  const keys = depositIndexKeys(referenceId, moncashReference);
  const updates: Record<string, DepositIndexEntry> = {};
  for (const key of keys) {
    const entry: DepositIndexEntry = {
      ...data,
      referenceId: data.referenceId ?? referenceId,
    };
    
    // N'inclure moncashReference que s'il a une valeur définie
    const resolvedMoncashReference = moncashReference ?? data.moncashReference;
    if (resolvedMoncashReference) {
      entry.moncashReference = resolvedMoncashReference;
    }
    
    updates[`deposit_index/${key}`] = entry;
  }
  await adminDB.ref().update(updates);
}

export async function resolveDepositByReference(
  reference: string
): Promise<ResolvedDeposit | null> {
  console.log("[MONCASH] Recherche dépôt par référence:", reference);
  
  const candidates = [
    sanitizeFirebaseKey(reference),
    reference,
  ].filter((k, i, arr) => k && arr.indexOf(k) === i);

  for (const key of candidates) {
    console.log("[MONCASH] Tentative recherche dans deposit_index:", key);
    const indexSnap = await adminDB.ref(`deposit_index/${key}`).once("value");
    if (!indexSnap.exists()) {
      console.log("[MONCASH] Index non trouvé pour:", key);
      continue;
    }

    const indexData = indexSnap.val() as DepositIndexEntry;
    console.log("[MONCASH] Index trouvé:", { 
      userId: indexData.userId, 
      depositId: indexData.depositId,
      status: indexData.status 
    });
    
    if (!indexData.userId || !indexData.depositId) {
      console.error("[MONCASH] Index invalide (userId ou depositId manquant):", indexData);
      continue;
    }

    const depositSnap = await adminDB
      .ref(`deposits/${indexData.userId}/${indexData.depositId}`)
      .once("value");

    if (!depositSnap.exists()) {
      console.error("[MONCASH] Dépôt introuvable dans deposits:", {
        userId: indexData.userId,
        depositId: indexData.depositId
      });
      continue;
    }

    console.log("[MONCASH] Dépôt trouvé:", {
      userId: indexData.userId,
      depositId: indexData.depositId,
      depositData: depositSnap.val()
    });

    return {
      userId: indexData.userId,
      depositId: indexData.depositId,
      deposit: depositSnap.val(),
      indexKey: key,
    };
  }

  console.error("[MONCASH] Dépôt non trouvé pour aucune des clés candidates:", candidates);
  return null;
}

export type WebhookClaimResult =
  | { kind: "already_processed" }
  | { kind: "claimed" }
  | { kind: "contention" };

export async function claimProcessedWebhook(reference: string): Promise<WebhookClaimResult> {
  const key = sanitizeFirebaseKey(reference);
  const ref = adminDB.ref(`processed_webhooks/${key}`);

  const existing = await ref.once("value");
  if (existing.exists() && existing.val()?.status === "processed") {
    return { kind: "already_processed" };
  }

  for (let attempt = 1; attempt <= MAX_TX_RETRIES; attempt++) {
    const result = await ref.transaction((current: { status?: string; timestamp?: number } | null) => {
      if (current?.status === "processed") {
        return current;
      }
      if (current?.status === "processing") {
        const started = current.timestamp ?? 0;
        // [FIX] Correction N°2 : Utilisation de LOCK_TIMEOUT_MS (10 min) au lieu de 120_000
        if (Date.now() - started < LOCK_TIMEOUT_MS) {
          return;
        }
      }
      return {
        status: "processing",
        timestamp: Date.now(),
      };
    });

    if (!result.committed) {
      await sleep(TX_RETRY_DELAY_MS * attempt);
      const again = await ref.once("value");
      if (again.exists() && again.val()?.status === "processed") {
        return { kind: "already_processed" };
      }
      continue;
    }

    const val = result.snapshot.val();
    if (val?.status === "processed") {
      return { kind: "already_processed" };
    }
    if (val?.status === "processing") {
      return { kind: "claimed" };
    }
  }

  return { kind: "contention" };
}

export async function markWebhookProcessed(reference: string): Promise<void> {
  const key = sanitizeFirebaseKey(reference);
  await adminDB.ref(`processed_webhooks/${key}`).set({
    status: "processed",
    timestamp: Date.now(),
  });
}

export async function releaseWebhookProcessing(reference: string): Promise<void> {
  const key = sanitizeFirebaseKey(reference);
  const ref = adminDB.ref(`processed_webhooks/${key}`);
  const snap = await ref.once("value");
  if (snap.exists() && snap.val()?.status === "processing") {
    await ref.remove();
  }
}

export async function creditWalletWithRetry(
  userId: string,
  amount: number
): Promise<{ success: true; newBalance: number; oldBalance: number } | { success: false; error: string }> {
  const userRef = adminDB.ref(`users/${userId}`);
  let lastError = "Transaction Firebase échouée";

  console.log("[MONCASH] Début crédit wallet avec retry:", { userId, maxRetries: MAX_TX_RETRIES });

  for (let attempt = 1; attempt <= MAX_TX_RETRIES; attempt++) {
    const beforeSnap = await userRef.once("value");
    const oldBalance = Number(beforeSnap.val()?.balance || 0);

    console.log("[MONCASH] Tentative crédit wallet", { userId, attempt, userExists: beforeSnap.exists() });

    const result = await userRef.transaction((current: Record<string, unknown> | null) => {
      // Si l'utilisateur n'existe pas, le créer avec un solde initial
      if (!current) {
        console.log("[MONCASH] Utilisateur inexistant, création avec solde initial:", userId);
        const newBalance = amount;
        return {
          balance: newBalance,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      const currentBalance = Number(current.balance || 0);
      const newBalance = currentBalance + amount;

      return {
        ...current,
        balance: newBalance,
        updatedAt: Date.now(),
      };
    });

    if (result.committed) {
      const newBalance = Number(result.snapshot.val()?.balance || 0);
      console.log("[MONCASH] Wallet crédité avec succès", { userId, attempt });
      return { success: true, newBalance, oldBalance };
    }

    lastError = "Transaction Firebase échouée - possible conflit concurrent";
    console.warn("[MONCASH] Transaction non committed (tentative " + attempt + "/" + MAX_TX_RETRIES + ")", { userId });

    if (attempt < MAX_TX_RETRIES) {
      const delay = TX_RETRY_DELAY_MS * attempt;
      await sleep(delay);
    }
  }

  // [FIX] Correction N°4 : Monitoring renforcé
  console.error("[MONCASH] ⚠️ CRITIQUE - Échec crédit wallet après 5 tentatives !", { userId, lastError });
  // [FIX] Placeholder pour alerte (Slack/Discord/Email) - À activer selon vos besoins
  // try {
  //   await fetch(process.env.SLACK_WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       text: `🚨 ALERTE CRITIQUE : Échec crédit wallet pour userId=${userId}, erreur=${lastError}`
  //     })
  //   });
  // } catch (alertErr) { console.error("Échec envoi alerte Slack", alertErr); }

  return { success: false, error: lastError };
}

export type CompleteDepositResult =
  | { ok: true; duplicate: boolean; newBalance?: number }
  | { ok: false; retryable: boolean; message: string };

/**
 * Finalise un dépôt MonCash (webhook ou réconciliation statut).
 */
export async function completeMonCashDeposit(params: {
  reference: string;
  amountFromWebhook: number;
  completedAt?: string;
  verifyWithMonCashApi?: boolean;
}): Promise<CompleteDepositResult> {
  const { reference, amountFromWebhook, completedAt, verifyWithMonCashApi = true } = params;

  const claim = await claimProcessedWebhook(reference);
  if (claim.kind === "already_processed") {
    console.log("[MONCASH] Paiement déjà traité (processed_webhooks)", reference);
    return { ok: true, duplicate: true };
  }
  if (claim.kind === "contention") {
    return { ok: false, retryable: true, message: "processing" };
  }

  try {
    const resolved = await resolveDepositByReference(reference);
    if (!resolved) {
      console.error("[MONCASH] Référence inconnue", reference);
      await adminDB.ref(`failed_webhook_events/${sanitizeFirebaseKey(reference)}`).set({
        event: "payment.completed",
        reference,
        amount: amountFromWebhook,
        receivedAt: Date.now(),
        reason: "deposit_not_found",
      });
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "unknown_reference" };
    }

    console.log("[MONCASH] Reference trouvée", {
      reference,
      userId: resolved.userId,
    });

    const deposit = resolved.deposit;
    const status = String(deposit.status ?? "");
    const expectedAmount = Number(deposit.amount);

    // ---- CORRECTION ICI ----
    // Récupérer le netAmount ou le recalculer si absent ou égal au brut
    let netAmount = Number(deposit.netAmount || deposit.amountNet || expectedAmount);

    // Si netAmount est égal au brut (pas de frais déduits) ou absent (valeur 0), on recalcule avec 3%
    if (netAmount === expectedAmount || netAmount <= 0) {
      const feeRate = 0.03; // 3% de frais
      const fee = Math.round((expectedAmount * feeRate) * 100) / 100;
      netAmount = Math.round((expectedAmount - fee) * 100) / 100;
      console.log("[MONCASH] netAmount recalculé car absent/incorrect:", {
        expectedAmount,
        fee,
        netAmount,
      });
    }
    // ---- FIN CORRECTION ----

    if (status === "completed") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true, newBalance: undefined };
    }

    if (status !== "pending") {
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "invalid_deposit_amount" };
    }

    const receivedAmount = Number(amountFromWebhook);
    // [FIX] Correction N°3 : Comparaison des flottants avec tolérance (0.01 HTG)
    if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
      console.error("[MONCASH] Montant mismatch (tolérance dépassée)", { 
        received: receivedAmount, 
        expected: expectedAmount,
        diff: Math.abs(receivedAmount - expectedAmount) 
      });
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: false, message: "amount_mismatch" };
    }

    if (verifyWithMonCashApi) {
      try {
        const apiRef =
          (deposit.referenceId as string) ||
          (deposit.id as string) ||
          reference;
        const moncashStatus = await getPaymentStatus(apiRef);
        if (moncashStatus.status !== "completed") {
          console.warn("[MONCASH] API MonCash non completed", {
            reference,
            apiStatus: moncashStatus.status,
          });
          await releaseWebhookProcessing(reference);
          return { ok: false, retryable: true, message: "processing" };
        }
        if (Number(moncashStatus.amount) !== expectedAmount) {
          await releaseWebhookProcessing(reference);
          return { ok: false, retryable: false, message: "amount_mismatch" };
        }
        console.log("[MONCASH] Paiement validé", { reference, amount: expectedAmount });
      } catch (apiErr) {
        console.error("[MONCASH] Erreur vérification API", apiErr);
        await releaseWebhookProcessing(reference);
        return { ok: false, retryable: true, message: "processing" };
      }
    }

    // [FIX] Correction N°2 : Double-vérification juste avant le crédit pour éviter le double paiement
    const finalStatusCheck = await adminDB
      .ref(`deposits/${resolved.userId}/${resolved.depositId}/status`)
      .once("value");

    if (finalStatusCheck.val() === "completed") {
      console.warn("[MONCASH] Dépôt déjà marqué completed juste avant crédit, annulation du double crédit", reference);
      await markWebhookProcessed(reference);
      return { ok: true, duplicate: true };
    }

    const credit = await creditWalletWithRetry(resolved.userId, netAmount);
    if (!credit.success) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: true, message: "processing" };
    }

    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const completedAtMs = completedAt ? new Date(completedAt).getTime() : Date.now();

    const walletTx = {
      type: "deposit",
      amount: netAmount,
      referenceId: reference,
      depositId: resolved.depositId,
      userId: resolved.userId,
      status: "completed",
      oldBalance: credit.oldBalance,
      newBalance: credit.newBalance,
      createdAt: Date.now(),
    };

    await adminDB.ref(`wallet_transactions/${resolved.userId}/${transactionId}`).set(walletTx);

    await adminDB.ref(`deposits/${resolved.userId}/${resolved.depositId}`).update({
      status: "completed",
      moncashTransactionId: reference,
      netAmount: netAmount,
      completedAt: completedAtMs,
    });

    const indexUpdates: Record<string, unknown> = {};
    for (const key of depositIndexKeys(
      String(deposit.referenceId ?? resolved.depositId),
      deposit.moncashReference as string | undefined
    )) {
      indexUpdates[`deposit_index/${key}/status`] = "completed";
      indexUpdates[`deposit_index/${key}/completedAt`] = completedAtMs;
    }
    indexUpdates[`deposit_index/${sanitizeFirebaseKey(reference)}/status`] = "completed";
    indexUpdates[`deposit_index/${sanitizeFirebaseKey(reference)}/completedAt`] = completedAtMs;
    await adminDB.ref().update(indexUpdates);

    const ledgerResult = await createDepositLedgerEntry(
      resolved.userId,
      netAmount,
      credit.oldBalance,
      credit.newBalance,
      reference,
      resolved.depositId
    );
    if (!ledgerResult.success) {
      console.error("[MONCASH] Erreur ledger (crédit déjà effectué)", ledgerResult.error);
    }

    await markWebhookProcessed(reference);
    console.log("[MONCASH] Terminé", {
      reference,
      userId: resolved.userId,
      newBalance: credit.newBalance,
    });

    return { ok: true, duplicate: false, newBalance: credit.newBalance };
  } catch (err) {
    console.error("[MONCASH] Erreur completeMonCashDeposit", err);
    await releaseWebhookProcessing(reference);
    return { ok: false, retryable: true, message: "processing" };
  }
}

export async function failMonCashDeposit(reference: string, failureReason: string): Promise<void> {
  const resolved = await resolveDepositByReference(reference);
  if (!resolved) {
    console.warn("[MONCASH] payment.failed — référence inconnue", reference);
    return;
  }

  const status = String(resolved.deposit.status ?? "");
  if (status !== "pending") {
    return;
  }

  await adminDB.ref(`deposits/${resolved.userId}/${resolved.depositId}`).update({
    status: "failed",
    failureReason,
    failedAt: Date.now(),
  });

  const deposit = resolved.deposit;
  const indexUpdates: Record<string, unknown> = {};
  for (const key of depositIndexKeys(
    String(deposit.referenceId ?? resolved.depositId),
    deposit.moncashReference as string | undefined
  )) {
    indexUpdates[`deposit_index/${key}/status`] = "failed";
  }
  await adminDB.ref().update(indexUpdates);
}