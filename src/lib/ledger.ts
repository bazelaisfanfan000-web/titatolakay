/**
 * Ledger Imuable - WinCash
 * Enregistrement permanent de toutes les transactions financières
 * Aucune suppression autorisée - historique complet et traçable
 */

import { adminDB } from "./firebaseAdmin";
import type {
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  TransactionSource
} from "@/types/wallet";

/**
 * Crée une entrée dans le ledger
 * Cette fonction est appelée après chaque transaction wallet réussie
 */
export async function createLedgerEntry(params: {
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  status: TransactionStatus;
  source: TransactionSource;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const transactionRef = adminDB.ref(`wallet_transactions/${params.userId}`).push();
    const transactionId = transactionRef.key;

    if (!transactionId) {
      return { success: false, error: "Impossible de générer un ID de transaction" };
    }

    const transaction: WalletTransaction = {
      id: transactionId,
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
      referenceId: params.referenceId,
      status: params.status,
      source: params.source,
      description: params.description,
      metadata: params.metadata,
      createdAt: Date.now(),
      completedAt: params.status === "completed" ? Date.now() : undefined
    };

    await transactionRef.set(transaction);

    console.log("[LEDGER] Entrée créée:", {
      transactionId,
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      referenceId: params.referenceId
    });

    return { success: true, transactionId };
  } catch (error) {
    console.error("[LEDGER] Erreur création entrée:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Met à jour le statut d'une transaction dans le ledger
 * Utilisé pour passer de pending à completed/failed
 */
export async function updateLedgerStatus(
  userId: string,
  transactionId: string,
  status: TransactionStatus,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transactionRef = adminDB.ref(`wallet_transactions/${userId}/${transactionId}`);

    const updates: Partial<WalletTransaction> = {
      status,
      updatedAt: Date.now()
    };

    if (status === "completed") {
      updates.completedAt = Date.now();
    }

    if (status === "failed" && failureReason) {
      updates.failureReason = failureReason;
      updates.failedAt = Date.now();
    }

    await transactionRef.update(updates);

    console.log("[LEDGER] Statut mis à jour:", { transactionId, status });

    return { success: true };
  } catch (error) {
    console.error("[LEDGER] Erreur mise à jour statut:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Récupère l'historique des transactions d'un utilisateur
 */
export async function getUserLedger(
  userId: string,
  limit: number = 50
): Promise<WalletTransaction[]> {
  try {
    const ledgerRef = adminDB
      .ref(`wallet_transactions/${userId}`)
      .orderByChild("createdAt")
      .limitToLast(limit);

    const snapshot = await ledgerRef.once("value");

    if (!snapshot.exists()) {
      return [];
    }

    const transactions: WalletTransaction[] = [];
    snapshot.forEach((child: any) => {
      transactions.push(child.val());
    });

    return transactions.reverse();
  } catch (error) {
    console.error("[LEDGER] Erreur récupération ledger:", error);
    return [];
  }
}

/**
 * Récupère une transaction spécifique par referenceId
 */
export async function getTransactionByReference(
  userId: string,
  referenceId: string
): Promise<WalletTransaction | null> {
  try {
    const ledgerRef = adminDB.ref(`wallet_transactions/${userId}`);
    const snapshot = await ledgerRef
      .orderByChild("referenceId")
      .equalTo(referenceId)
      .once("value");

    if (!snapshot.exists()) {
      return null;
    }

    let transaction: WalletTransaction | null = null;
    snapshot.forEach((child: any) => {
      transaction = child.val();
    });

    return transaction;
  } catch (error) {
    console.error("[LEDGER] Erreur recherche par reference:", error);
    return null;
  }
}

/**
 * Vérifie si une transaction avec un referenceId existe déjà
 * Pour la déduplication
 */
export async function transactionExists(
  userId: string,
  referenceId: string
): Promise<boolean> {
  const transaction = await getTransactionByReference(userId, referenceId);
  return transaction !== null;
}

/**
 * Récupère le solde avant/après pour une transaction
 * Utile pour les audits et les rollbacks
 */
export async function getTransactionBalances(
  userId: string,
  transactionId: string
): Promise<{ balanceBefore?: number; balanceAfter?: number } | null> {
  try {
    const snapshot = await adminDB
      .ref(`wallet_transactions/${userId}/${transactionId}`)
      .once("value");

    if (!snapshot.exists()) {
      return null;
    }

    const transaction = snapshot.val();
    return {
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter
    };
  } catch (error) {
    console.error("[LEDGER] Erreur récupération soldes:", error);
    return null;
  }
}

/**
 * Calcule le total des transactions par type et période
 * Pour les rapports financiers
 */
export async function getTransactionSummary(
  userId: string,
  type?: TransactionType,
  startDate?: number,
  endDate?: number
): Promise<{
  count: number;
  totalAmount: number;
  transactions: WalletTransaction[];
}> {
  try {
    const ref = adminDB.ref(`wallet_transactions/${userId}`);
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      return { count: 0, totalAmount: 0, transactions: [] };
    }

    const transactions: WalletTransaction[] = [];
    let totalAmount = 0;

    snapshot.forEach((child: any) => {
      const tx = child.val();
      
      // Filtrer par type si spécifié
      if (type && tx.type !== type) return;
      
      // Filtrer par date si spécifié
      if (startDate && tx.createdAt < startDate) return;
      if (endDate && tx.createdAt > endDate) return;

      transactions.push(tx);
      totalAmount += tx.amount;
    });

    return {
      count: transactions.length,
      totalAmount,
      transactions: transactions.reverse()
    };
  } catch (error) {
    console.error("[LEDGER] Erreur résumé transactions:", error);
    return { count: 0, totalAmount: 0, transactions: [] };
  }
}

/**
 * Crée une entrée de dépôt dans le ledger
 */
export async function createDepositLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  depositId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "deposit",
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "moncash",
    description: `Dépôt MonCash - ${depositId}`,
    metadata: { depositId }
  });
}

/**
 * Crée une entrée de retrait dans le ledger
 */
export async function createWithdrawalLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  withdrawalId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "withdraw",
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "moncash",
    description: `Retrait MonCash - ${withdrawalId}`,
    metadata: { withdrawalId }
  });
}

/**
 * Crée une entrée de mise de jeu dans le ledger
 */
export async function createGameBetLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  gameId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "game_bet",
    amount: -amount, // Négatif pour débit
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "game",
    description: `Mise de jeu - ${gameId}`,
    metadata: { gameId }
  });
}

/**
 * Crée une entrée de gain de jeu dans le ledger
 */
export async function createGameWinLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  gameId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "game_win",
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "game",
    description: `Gain de jeu - ${gameId}`,
    metadata: { gameId }
  });
}

/**
 * Crée une entrée de remboursement dans le ledger
 */
export async function createRefundLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  reason: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "game_refund",
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "system",
    description: `Remboursement - ${reason}`,
    metadata: { reason }
  });
}

/**
 * Crée une entrée de commission dans le ledger
 */
export async function createCommissionLedgerEntry(
  userId: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  gameId?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  return createLedgerEntry({
    userId,
    type: "commission",
    amount: -amount, // Négatif pour débit
    balanceBefore,
    balanceAfter,
    referenceId,
    status: "completed",
    source: "system",
    description: "Commission plateforme",
    metadata: { gameId }
  });
}
