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

export interface DepositIndexEntry {
  userId: string;
  depositId: string;
  referenceId?: string;
  moncashReference?: string;
  amount?: number;
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
        if (Date.now() - started < 120_000) {
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

  console.log("[MONCASH] Début crédit wallet avec retry:", { userId, amount, maxRetries: MAX_TX_RETRIES });

  for (let attempt = 1; attempt <= MAX_TX_RETRIES; attempt++) {
    const beforeSnap = await userRef.once("value");
    const oldBalance = Number(beforeSnap.val()?.balance || 0);

    console.log("[MONCASH] Tentative crédit wallet", { userId, amount, attempt, oldBalance, userExists: beforeSnap.exists() });

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
      
      console.log("[MONCASH] Transaction - Calcul solde:", { 
        currentBalance, 
        amount, 
        newBalance 
      });
      
      return {
        ...current,
        balance: newBalance,
        updatedAt: Date.now(),
      };
    });

    if (result.committed) {
      const newBalance = Number(result.snapshot.val()?.balance || 0);
      console.log("[MONCASH] Wallet crédité avec succès", { 
        userId, 
        amount, 
        oldBalance, 
        newBalance, 
        attempt 
      });
      return { success: true, newBalance, oldBalance };
    }

    lastError = "Transaction Firebase échouée - possible conflit concurrent";
    console.warn("[MONCASH] Transaction non committed (tentative " + attempt + "/" + MAX_TX_RETRIES + ")", { userId });
    
    if (attempt < MAX_TX_RETRIES) {
      const delay = TX_RETRY_DELAY_MS * attempt;
      console.log("[MONCASH] Attente avant retry:", delay + "ms");
      await sleep(delay);
    }
  }

  console.error("[MONCASH] Échec crédit wallet après toutes les tentatives:", { userId, amount, lastError });
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
      depositId: resolved.depositId,
    });

    const deposit = resolved.deposit;
    const status = String(deposit.status ?? "");
    const expectedAmount = Number(deposit.amount);

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
    if (receivedAmount !== expectedAmount) {
      console.error("[MONCASH] Montant mismatch", {
        expected: expectedAmount,
        received: receivedAmount,
        reference,
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

    const credit = await creditWalletWithRetry(resolved.userId, expectedAmount);
    if (!credit.success) {
      await releaseWebhookProcessing(reference);
      return { ok: false, retryable: true, message: "processing" };
    }

    // Mise à jour des champs wagering après crédit réussi
    const userRef = adminDB.ref(`users/${resolved.userId}`);
    const wageringResult = await userRef.transaction((current: Record<string, unknown> | null) => {
      if (!current) {
        return; // Annuler si l'utilisateur n'existe pas
      }

      const currentTotalDeposits = Number(current.totalDeposits || 0);
      const newTotalDeposits = currentTotalDeposits + expectedAmount;
      const newWageringRequired = newTotalDeposits * 1.5;
      const currentWageringCompleted = Number(current.wageringCompleted || 0);
      const withdrawalUnlocked = currentWageringCompleted >= newWageringRequired;

      console.log("[MONCASH] Mise à jour wagering:", {
        currentTotalDeposits,
        newTotalDeposits,
        newWageringRequired,
        currentWageringCompleted,
        withdrawalUnlocked
      });

      return {
        ...current,
        totalDeposits: newTotalDeposits,
        wageringRequired: newWageringRequired,
        withdrawalUnlocked,
        lastDepositAmount: expectedAmount, // Enregistrer le montant du dernier dépôt
        firstGamePlayed: false, // Réinitialiser après dépôt - le joueur doit jouer 1 partie
        wageringUpdatedAt: Date.now(),
      };
    });

    if (!wageringResult.committed) {
      console.warn("[MONCASH] Transaction wagering non committed (continuera quand même)");
    } else {
      console.log("[MONCASH] Wagering mis à jour avec succès");
    }

    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const completedAtMs = completedAt ? new Date(completedAt).getTime() : Date.now();

    const walletTx = {
      type: "deposit",
      amount: expectedAmount,
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
      netAmount: expectedAmount,
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
      expectedAmount,
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
