/*
====================================================
TiTaTo - Wallet Ledger (CORRIGÉ)
====================================================

Ledger centralisé pour tous les mouvements financiers.

Architecture :
  users/{uid}/balance
  users/{uid}/reservedBalance
  transactions/{uid}/{transactionId}

Toutes les modifications de solde passent par ce fichier.
Ne jamais modifier `users/{uid}/balance` directement.
====================================================
*/

import { adminDB } from "./firebaseAdmin";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------
export type TransactionType =
  | "deposit"
  | "bet"
  | "win"
  | "withdraw"
  | "withdrawal_refund"
  | "commission"
  | "reward"
  | "adjustment";

export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

export interface AddTransactionInput {
  type: TransactionType;
  amount: number;
  roomId?: string;
  withdrawalId?: string;
  referenceId?: string;
  status?: TransactionStatus;
  description?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface BalanceOperationResult {
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  amount: number;
  transactionId?: string;
}

// ----------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ----------------------------------------------------------------
function validateAmount(amount: number): void {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("Montant invalide");
  }
  if (amount <= 0) {
    throw new Error("Le montant doit être supérieur à zéro");
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded !== amount) {
    throw new Error("Le montant ne peut pas contenir plus de deux décimales");
  }
}

function normalizeBalance(value: unknown): number {
  const balance = Number(value || 0);
  if (!Number.isFinite(balance) || balance < 0) return 0;
  return balance;
}

// ----------------------------------------------------------------
// IDEMPOTENCE : Vérifier si une transaction existe déjà
// ----------------------------------------------------------------
async function isTransactionProcessed(
  uid: string,
  referenceId: string,
  type: TransactionType
): Promise<boolean> {
  if (!referenceId) return false;
  const snapshot = await adminDB
    .ref(`transactions/${uid}`)
    .orderByChild("referenceId")
    .equalTo(referenceId)
    .once("value");

  if (!snapshot.exists()) return false;
  const entries = snapshot.val();
  return Object.values(entries).some(
    (tx: any) =>
      tx.type === type &&
      (tx.status === "completed" || tx.status === "refunded" || tx.status === "failed")
  );
}

// ----------------------------------------------------------------
// ÉCRIRE UNE TRANSACTION DANS LE LEDGER
// ----------------------------------------------------------------
export async function addTransaction(
  uid: string,
  data: AddTransactionInput
): Promise<string> {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID utilisateur invalide");
  }
  validateAmount(data.amount);

  const transactionRef = adminDB.ref(`transactions/${uid}`).push();
  const transactionId = transactionRef.key;
  if (!transactionId) {
    throw new Error("Impossible de créer l'identifiant de transaction");
  }

  const now = Date.now();
  await transactionRef.set({
    id: transactionId,
    uid,
    type: data.type,
    amount: data.amount,
    roomId: data.roomId || null,
    withdrawalId: data.withdrawalId || null,
    referenceId: data.referenceId || null,
    status: data.status || "completed",
    description: data.description || null,
    metadata: data.metadata || null,
    createdAt: now,
  });

  return transactionId;
}

// ----------------------------------------------------------------
// LECTURE DU SOLDE
// ----------------------------------------------------------------
export async function getBalance(uid: string): Promise<number> {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID utilisateur invalide");
  }
  const snapshot = await adminDB.ref(`users/${uid}/balance`).get();
  return normalizeBalance(snapshot.val());
}

// ----------------------------------------------------------------
// AJOUTER DU SOLDE (avec idempotence)
// ----------------------------------------------------------------
export async function addBalance(
  uid: string,
  amount: number,
  transactionData?: Omit<AddTransactionInput, "amount">
): Promise<BalanceOperationResult & { transactionId?: string }> {
  validateAmount(amount);

  // 1. Idempotence
  const refId = transactionData?.referenceId || null;
  if (refId) {
    const already = await isTransactionProcessed(uid, refId, transactionData?.type || "adjustment");
    if (already) {
      console.log("[LEDGER] addBalance idempotent – déjà traité", { uid, refId });
      const balance = await getBalance(uid);
      return {
        success: true,
        balanceBefore: balance - amount,
        balanceAfter: balance,
        amount,
        transactionId: undefined,
      };
    }
  }

  // 2. Transaction atomique sur l'objet utilisateur
  const userRef = adminDB.ref(`users/${uid}`);
  const result = await userRef.transaction((current) => {
    if (!current) {
      // Si l'utilisateur n'existe pas, on le crée avec le solde initial
      return {
        balance: amount,
        reservedBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    const balance = normalizeBalance(current.balance);
    const newBalance = Math.round((balance + amount) * 100) / 100;
    return {
      ...current,
      balance: newBalance,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error("Transaction Firebase échouée (solde non modifié)");
  }

  const balanceAfter = normalizeBalance(result.snapshot.val()?.balance);
  const balanceBefore = Math.round((balanceAfter - amount) * 100) / 100;

  // 3. Écrire dans le ledger (après modification)
  let transactionId: string | undefined;
  try {
    transactionId = await addTransaction(uid, {
      type: transactionData?.type || "adjustment",
      amount,
      roomId: transactionData?.roomId,
      withdrawalId: transactionData?.withdrawalId,
      referenceId: refId || undefined,
      status: transactionData?.status || "completed",
      description: transactionData?.description,
      metadata: transactionData?.metadata,
    });
  } catch (ledgerError) {
    console.error("[LEDGER] CRITICAL: Échec écriture ledger après crédit !", {
      uid,
      amount,
      balanceBefore,
      balanceAfter,
      error: ledgerError,
    });
    // On ne bloque pas, mais on alerte fortement (le solde est modifié).
  }

  console.log("[LEDGER] addBalance réussi", { uid, amount, balanceBefore, balanceAfter, transactionId });
  return {
    success: true,
    balanceBefore,
    balanceAfter,
    amount,
    transactionId,
  };
}

// ----------------------------------------------------------------
// RETIRER DU SOLDE (avec idempotence)
// ----------------------------------------------------------------
export async function removeBalance(
  uid: string,
  amount: number,
  transactionData?: Omit<AddTransactionInput, "amount">
): Promise<BalanceOperationResult & { transactionId?: string }> {
  validateAmount(amount);

  const refId = transactionData?.referenceId || null;
  if (refId) {
    const already = await isTransactionProcessed(uid, refId, transactionData?.type || "withdraw");
    if (already) {
      console.log("[LEDGER] removeBalance idempotent – déjà traité", { uid, refId });
      const balance = await getBalance(uid);
      return {
        success: true,
        balanceBefore: balance + amount,
        balanceAfter: balance,
        amount,
        transactionId: undefined,
      };
    }
  }

  // Transaction atomique
  const userRef = adminDB.ref(`users/${uid}`);
  const result = await userRef.transaction((current) => {
    if (!current) {
      // Pas de wallet, on annule
      return;
    }
    const balance = normalizeBalance(current.balance);
    if (balance < amount) {
      return; // annuler
    }
    const newBalance = Math.round((balance - amount) * 100) / 100;
    return {
      ...current,
      balance: newBalance,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error("Solde insuffisant ou transaction annulée");
  }

  const balanceAfter = normalizeBalance(result.snapshot.val()?.balance);
  const balanceBefore = Math.round((balanceAfter + amount) * 100) / 100;

  let transactionId: string | undefined;
  try {
    transactionId = await addTransaction(uid, {
      type: transactionData?.type || "withdraw",
      amount,
      roomId: transactionData?.roomId,
      withdrawalId: transactionData?.withdrawalId,
      referenceId: refId || undefined,
      status: transactionData?.status || "completed",
      description: transactionData?.description,
      metadata: transactionData?.metadata,
    });
  } catch (ledgerError) {
    console.error("[LEDGER] CRITICAL: Échec écriture ledger après débit !", {
      uid,
      amount,
      balanceBefore,
      balanceAfter,
      error: ledgerError,
    });
  }

  console.log("[LEDGER] removeBalance réussi", { uid, amount, balanceBefore, balanceAfter, transactionId });
  return {
    success: true,
    balanceBefore,
    balanceAfter,
    amount,
    transactionId,
  };
}

// ----------------------------------------------------------------
// RÉSERVER DES FONDS (pour un retrait)
// ----------------------------------------------------------------
export async function reserveFunds(
  uid: string,
  amount: number,
  withdrawalId: string,
  referenceId: string
) {
  validateAmount(amount);

  // Idempotence : vérifier qu'on n'a pas déjà réservé pour ce retrait
  const already = await isTransactionProcessed(uid, referenceId, "withdraw");
  if (already) {
    console.log("[LEDGER] reserveFunds idempotent – déjà traité", { uid, referenceId });
    return { success: true, amount };
  }

  const userRef = adminDB.ref(`users/${uid}`);
  const result = await userRef.transaction((current) => {
    if (!current) {
      return; // utilisateur inexistant
    }
    const balance = normalizeBalance(current.balance);
    const reserved = normalizeBalance(current.reservedBalance);
    const available = balance - reserved;

    if (available < amount) {
      return; // solde insuffisant
    }

    const newReserved = Math.round((reserved + amount) * 100) / 100;
    return {
      ...current,
      reservedBalance: newReserved,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error("Solde disponible insuffisant pour la réservation");
  }

  // Écrire dans le ledger
  try {
    await addTransaction(uid, {
      type: "withdraw",
      amount,
      withdrawalId,
      referenceId,
      status: "pending",
      description: "Réservation de fonds pour retrait",
    });
  } catch (ledgerError) {
    // Rollback : annuler la réservation
    console.error("[LEDGER] Échec écriture ledger, rollback réservation", ledgerError);
    await userRef.transaction((current) => {
      if (!current) return;
      const reserved = normalizeBalance(current.reservedBalance);
      return {
        ...current,
        reservedBalance: Math.max(0, reserved - amount),
        updatedAt: Date.now(),
      };
    });
    throw new Error("Échec d'enregistrement ledger, réservation annulée");
  }

  console.log("[LEDGER] reserveFunds réussi", { uid, amount, withdrawalId });
  return { success: true, amount };
}

// ----------------------------------------------------------------
// REMBOURSER UN RETRAIT (annuler la réservation)
// ----------------------------------------------------------------
export async function refundWithdrawal(
  uid: string,
  amount: number,
  withdrawalId: string,
  referenceId: string
) {
  validateAmount(amount);

  // Idempotence
  const already = await isTransactionProcessed(uid, referenceId, "withdrawal_refund");
  if (already) {
    console.log("[LEDGER] refundWithdrawal idempotent – déjà traité", { uid, referenceId });
    return { success: true, amount };
  }

  const userRef = adminDB.ref(`users/${uid}`);
  const result = await userRef.transaction((current) => {
    if (!current) {
      return; // utilisateur inexistant
    }
    const reserved = normalizeBalance(current.reservedBalance);
    if (reserved < amount) {
      return; // pas assez réservé
    }
    const newReserved = Math.round((reserved - amount) * 100) / 100;
    return {
      ...current,
      reservedBalance: newReserved,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error("Impossible de libérer les fonds réservés");
  }

  // Ledger
  try {
    await addTransaction(uid, {
      type: "withdrawal_refund",
      amount,
      withdrawalId,
      referenceId,
      status: "refunded",
      description: "Remboursement d'un retrait échoué",
    });
  } catch (ledgerError) {
    console.error("[LEDGER] Échec écriture ledger pour remboursement", ledgerError);
    // On ne rollback pas car la libération est déjà faite. On alerte.
  }

  console.log("[LEDGER] refundWithdrawal réussi", { uid, amount, withdrawalId });
  return { success: true, amount };
}

// ----------------------------------------------------------------
// FONCTIONS SPÉCIFIQUES (GAIN, MISE, COMMISSION)
// ----------------------------------------------------------------
export async function creditWin(uid: string, amount: number, roomId?: string) {
  return addBalance(uid, amount, {
    type: "win",
    roomId,
    status: "completed",
    description: "Gain de partie Wincash",
  });
}

export async function debitBet(uid: string, amount: number, roomId?: string) {
  return removeBalance(uid, amount, {
    type: "bet",
    roomId,
    status: "completed",
    description: "Mise de partie Wincash",
  });
}

export async function addCommission(uid: string, amount: number, roomId?: string) {
  return removeBalance(uid, amount, {
    type: "commission",
    roomId,
    status: "completed",
    description: "Commission Wincash",
  });
}