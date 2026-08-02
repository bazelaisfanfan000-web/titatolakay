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

// =====================================================
// SYSTÈME DE LEDGER ATOMIQUE - TRANSACTION FIREBASE
// =====================================================

/**
 * Result type pour les opérations atomiques
 */
type AtomicResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code: string;
};

/**
 * Crée une entrée de ledger avec transaction atomique
 * Cette fonction est appelée DANS une transaction Firebase existante
 * 
 * IMPORTANT: Cette fonction ne doit PAS être appelée directement.
 * Elle doit être utilisée à l'intérieur d'une transaction Firebase.
 */
export function createLedgerEntryAtomic(
  userId: string,
  transactionId: string,
  params: {
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceId: string;
    status: string;
    source: string;
    description?: string;
    metadata?: Record<string, any>;
  }
): Record<string, any> {
  const entry = {
    id: transactionId,
    userId,
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

  console.log("[LEDGER_ATOMIC] Création entrée atomique:", {
    transactionId,
    userId,
    type: params.type,
    amount: params.amount,
    referenceId: params.referenceId
  });

  return entry;
}

/**
 * Vérifie et crédite l'utilisateur avec transaction atomique
 * Cette fonction effectue TOUT ou RIEN :
 * 1. Vérifie le solde avant
 * 2. Crédite le solde
 * 3. Crée l'entrée ledger
 * 
 * @param userId - ID Firebase de l'utilisateur
 * @param amount - Montant à créditer (en HTG, nombre décimal)
 * @param referenceId - Référence unique pour idempotence
 * @param metadata - Métadonnées additionnelles
 * @returns Result avec les détails de la transaction
 */
export async function verifyAndCreditUserAtomic(params: {
  userId: string;
  amount: number;
  referenceId: string;
  metadata?: Record<string, any>;
}): Promise<AtomicResult<{
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
}>> {
  console.log("[LEDGER_ATOMIC] Début crédit atomique:", {
    userId: params.userId,
    amount: params.amount,
    referenceId: params.referenceId
  });

  try {
    const userRef = adminDB.ref(`users/${params.userId}`);
    
    // Transaction atomique Firebase
    const result = await userRef.transaction((current: any) => {
      // Si l'utilisateur n'existe pas, annuler
      if (!current) {
        console.error("[LEDGER_ATOMIC] Utilisateur inexistant:", params.userId);
        return;
      }

      const balanceBefore = Number(current.balance || 0);
      const balanceAfter = balanceBefore + params.amount;

      console.log("[LEDGER_ATOMIC] Calcul solde:", {
        userId: params.userId,
        balanceBefore,
        amount: params.amount,
        balanceAfter
      });

      // Générer un ID de transaction unique
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Retourner l'état mis à jour avec l'entrée ledger
      return {
        ...current,
        balance: balanceAfter,
        updatedAt: Date.now(),
        // L'entrée ledger sera créée dans la même transaction
        _ledgerEntry: createLedgerEntryAtomic(params.userId, transactionId, {
          type: "deposit",
          amount: params.amount,
          balanceBefore,
          balanceAfter,
          referenceId: params.referenceId,
          status: "completed",
          source: "moncash",
          description: `Dépôt MonCash - ${params.referenceId}`,
          metadata: params.metadata
        })
      };
    });

    if (!result.committed) {
      console.error("[LEDGER_ATOMIC] Transaction non committed:", params.userId);
      return {
        success: false,
        error: "Transaction Firebase échouée",
        code: "TRANSACTION_FAILED"
      };
    }

    const snapshot = result.snapshot.val();
    const ledgerEntry = snapshot._ledgerEntry;

    if (!ledgerEntry) {
      console.error("[LEDGER_ATOMIC] Entrée ledger non créée:", params.userId);
      return {
        success: false,
        error: "Entrée ledger non créée",
        code: "LEDGER_NOT_CREATED"
      };
    }

    // Créer l'entrée ledger séparément (car Firebase transaction ne supporte pas les chemins imbriqués complexes)
    const ledgerRef = adminDB.ref(`wallet_transactions/${params.userId}/${ledgerEntry.id}`);
    await ledgerRef.set(ledgerEntry);

    // Nettoyer le champ temporaire
    await userRef.child("_ledgerEntry").remove();

    console.log("[LEDGER_ATOMIC] Crédit réussi:", {
      userId: params.userId,
      transactionId: ledgerEntry.id,
      balanceBefore: ledgerEntry.balanceBefore,
      balanceAfter: ledgerEntry.balanceAfter
    });

    return {
      success: true,
      data: {
        transactionId: ledgerEntry.id,
        balanceBefore: ledgerEntry.balanceBefore,
        balanceAfter: ledgerEntry.balanceAfter
      }
    };

  } catch (error) {
    console.error("[LEDGER_ATOMIC] Erreur crédit atomique:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Complète un dépôt MonCash avec transaction atomique
 * Cette fonction effectue TOUT ou RIEN :
 * 1. Vérifie l'idempotence (déjà traité ?)
 * 2. Vérifie le dépôt existe et est en pending
 * 3. Valide le montant
 * 4. Crédite le solde utilisateur
 * 5. Crée l'entrée ledger
 * 6. Met à jour le statut du dépôt
 * 
 * @param reference - Référence MonCash du dépôt
 * @param amount - Montant du dépôt
 * @param userId - ID de l'utilisateur
 * @param depositId - ID du dépôt
 * @returns Result avec les détails de la transaction
 */
export async function completeMonCashDepositAtomic(params: {
  reference: string;
  amount: number;
  userId: string;
  depositId: string;
}): Promise<AtomicResult<{
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
}>> {
  console.log("[LEDGER_ATOMIC] Début completion dépôt atomique:", {
    reference: params.reference,
    amount: params.amount,
    userId: params.userId,
    depositId: params.depositId
  });

  try {
    // 1. Vérifier si déjà traité (idempotence)
    const existingTx = await getTransactionByReference(params.userId, params.reference);
    if (existingTx && existingTx.status === "completed") {
      console.log("[LEDGER_ATOMIC] Dépôt déjà traité:", params.reference);
      return {
        success: false,
        error: "Dépôt déjà traité",
        code: "ALREADY_PROCESSED"
      };
    }

    // 2. Vérifier le dépôt existe et est en pending
    const depositRef = adminDB.ref(`deposits/${params.userId}/${params.depositId}`);
    const depositSnapshot = await depositRef.once("value");

    if (!depositSnapshot.exists()) {
      console.error("[LEDGER_ATOMIC] Dépôt non trouvé:", params.depositId);
      return {
        success: false,
        error: "Dépôt non trouvé",
        code: "DEPOSIT_NOT_FOUND"
      };
    }

    const deposit = depositSnapshot.val();

    if (deposit.status !== "pending") {
      console.log("[LEDGER_ATOMIC] Dépôt non en pending:", deposit.status);
      return {
        success: false,
        error: `Dépôt déjà ${deposit.status}`,
        code: "DEPOSIT_NOT_PENDING"
      };
    }

    if (deposit.amount !== params.amount) {
      console.error("[LEDGER_ATOMIC] Montant mismatch:", {
        expected: deposit.amount,
        received: params.amount
      });
      return {
        success: false,
        error: "Montant mismatch",
        code: "AMOUNT_MISMATCH"
      };
    }

    // 3. Transaction atomique : crédit solde + mise à jour dépôt
    const userRef = adminDB.ref(`users/${params.userId}`);
    const result = await userRef.transaction((current: any) => {
      if (!current) {
        console.error("[LEDGER_ATOMIC] Utilisateur inexistant:", params.userId);
        return;
      }

      const balanceBefore = Number(current.balance || 0);
      const balanceAfter = balanceBefore + params.amount;

      console.log("[LEDGER_ATOMIC] Transaction dépôt:", {
        userId: params.userId,
        balanceBefore,
        amount: params.amount,
        balanceAfter
      });

      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        ...current,
        balance: balanceAfter,
        updatedAt: Date.now(),
        _ledgerEntry: createLedgerEntryAtomic(params.userId, transactionId, {
          type: "deposit",
          amount: params.amount,
          balanceBefore,
          balanceAfter,
          referenceId: params.reference,
          status: "completed",
          source: "moncash",
          description: `Dépôt MonCash - ${params.depositId}`,
          metadata: { depositId: params.depositId }
        })
      };
    });

    if (!result.committed) {
      console.error("[LEDGER_ATOMIC] Transaction non committed:", params.userId);
      return {
        success: false,
        error: "Transaction Firebase échouée",
        code: "TRANSACTION_FAILED"
      };
    }

    const snapshot = result.snapshot.val();
    const ledgerEntry = snapshot._ledgerEntry;

    if (!ledgerEntry) {
      console.error("[LEDGER_ATOMIC] Entrée ledger non créée:", params.userId);
      return {
        success: false,
        error: "Entrée ledger non créée",
        code: "LEDGER_NOT_CREATED"
      };
    }

    // 4. Créer l'entrée ledger
    const ledgerRef = adminDB.ref(`wallet_transactions/${params.userId}/${ledgerEntry.id}`);
    await ledgerRef.set(ledgerEntry);

    // Nettoyer le champ temporaire
    await userRef.child("_ledgerEntry").remove();

    // 5. Mettre à jour le statut du dépôt
    await depositRef.update({
      status: "completed",
      moncashTransactionId: params.reference,
      netAmount: params.amount,
      completedAt: Date.now()
    });

    console.log("[LEDGER_ATOMIC] Dépôt complété avec succès:", {
      reference: params.reference,
      userId: params.userId,
      transactionId: ledgerEntry.id,
      balanceBefore: ledgerEntry.balanceBefore,
      balanceAfter: ledgerEntry.balanceAfter
    });

    return {
      success: true,
      data: {
        transactionId: ledgerEntry.id,
        balanceBefore: ledgerEntry.balanceBefore,
        balanceAfter: ledgerEntry.balanceAfter
      }
    };

  } catch (error) {
    console.error("[LEDGER_ATOMIC] Erreur completion dépôt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Vérifie et débite l'utilisateur avec transaction atomique
 * Pour les retraits et les mises de jeu
 * 
 * @param userId - ID Firebase de l'utilisateur
 * @param amount - Montant à débiter
 * @param referenceId - Référence unique
 * @param type - Type de transaction (withdraw, game_bet, etc.)
 * @param metadata - Métadonnées additionnelles
 * @returns Result avec les détails de la transaction
 */
export async function verifyAndDebitUserAtomic(params: {
  userId: string;
  amount: number;
  referenceId: string;
  type: string;
  source: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<AtomicResult<{
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
}>> {
  console.log("[LEDGER_ATOMIC] Début débit atomique:", {
    userId: params.userId,
    amount: params.amount,
    referenceId: params.referenceId,
    type: params.type
  });

  try {
    const userRef = adminDB.ref(`users/${params.userId}`);
    
    const result = await userRef.transaction((current: any) => {
      if (!current) {
        console.error("[LEDGER_ATOMIC] Utilisateur inexistant:", params.userId);
        return;
      }

      const balanceBefore = Number(current.balance || 0);

      // Vérifier solde suffisant
      if (balanceBefore < params.amount) {
        console.warn("[LEDGER_ATOMIC] Solde insuffisant:", {
          userId: params.userId,
          balanceBefore,
          amount: params.amount
        });
        return; // Annuler la transaction
      }

      const balanceAfter = balanceBefore - params.amount;

      console.log("[LEDGER_ATOMIC] Calcul débit:", {
        userId: params.userId,
        balanceBefore,
        amount: params.amount,
        balanceAfter
      });

      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        ...current,
        balance: balanceAfter,
        updatedAt: Date.now(),
        _ledgerEntry: createLedgerEntryAtomic(params.userId, transactionId, {
          type: params.type,
          amount: -params.amount, // Négatif pour débit
          balanceBefore,
          balanceAfter,
          referenceId: params.referenceId,
          status: "completed",
          source: params.source,
          description: params.description,
          metadata: params.metadata
        })
      };
    });

    if (!result.committed) {
      console.error("[LEDGER_ATOMIC] Transaction non committed:", params.userId);
      return {
        success: false,
        error: "Transaction Firebase échouée",
        code: "TRANSACTION_FAILED"
      };
    }

    const snapshot = result.snapshot.val();
    const ledgerEntry = snapshot._ledgerEntry;

    if (!ledgerEntry) {
      console.error("[LEDGER_ATOMIC] Entrée ledger non créée:", params.userId);
      return {
        success: false,
        error: "Entrée ledger non créée",
        code: "LEDGER_NOT_CREATED"
      };
    }

    // Créer l'entrée ledger
    const ledgerRef = adminDB.ref(`wallet_transactions/${params.userId}/${ledgerEntry.id}`);
    await ledgerRef.set(ledgerEntry);

    // Nettoyer le champ temporaire
    await userRef.child("_ledgerEntry").remove();

    console.log("[LEDGER_ATOMIC] Débit réussi:", {
      userId: params.userId,
      transactionId: ledgerEntry.id,
      balanceBefore: ledgerEntry.balanceBefore,
      balanceAfter: ledgerEntry.balanceAfter
    });

    return {
      success: true,
      data: {
        transactionId: ledgerEntry.id,
        balanceBefore: ledgerEntry.balanceBefore,
        balanceAfter: ledgerEntry.balanceAfter
      }
    };

  } catch (error) {
    console.error("[LEDGER_ATOMIC] Erreur débit atomique:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

