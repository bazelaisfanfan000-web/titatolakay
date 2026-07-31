import { adminDB } from "@/lib/firebaseAdmin";

/**
 * Système de Ledger Financier Indépendant
 * 
 * Permet la réconciliation des soldes et l'audit complet
 * des opérations financières.
 * 
 * Structure:
 * ledger/{uid}/{transactionId}
 *   - type: "deposit" | "withdrawal" | "bet" | "reward" | "refund"
 *   - amount: number (positif ou négatif)
 *   - balanceBefore: number
 *   - balanceAfter: number
 *   - reference: string (MonCash reference ou game ID)
 *   - status: "pending" | "completed" | "failed"
 *   - metadata: object (données additionnelles)
 *   - createdAt: timestamp
 *   - completedAt: timestamp
 */

export interface LedgerEntry {
  id: string;
  uid: string;
  type: "deposit" | "withdrawal" | "bet" | "reward" | "refund";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  status: "pending" | "completed" | "failed";
  metadata?: Record<string, any>;
  createdAt: number;
  completedAt?: number;
}

/**
 * Crée une entrée dans le ledger
 */
export async function createLedgerEntry(
  uid: string,
  type: LedgerEntry["type"],
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  reference?: string,
  metadata?: Record<string, any>
): Promise<string> {
  const ledgerRef = adminDB.ref(`ledger/${uid}`).push();
  const entryId = ledgerRef.key;

  if (!entryId) {
    throw new Error("Impossible de créer l'entrée ledger");
  }

  const entry: LedgerEntry = {
    id: entryId,
    uid,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    reference,
    status: "completed",
    metadata,
    createdAt: Date.now(),
    completedAt: Date.now()
  };

  await ledgerRef.set(entry);

  console.log("[LEDGER] Entrée créée:", {
    uid,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    entryId
  });

  return entryId;
}

/**
 * Crée une entrée ledger pour un dépôt
 */
export async function createDepositLedgerEntry(
  uid: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  referenceId: string,
  depositId: string
): Promise<string> {
  return createLedgerEntry(
    uid,
    "deposit",
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    { depositId }
  );
}

/**
 * Crée une entrée ledger pour un retrait
 */
export async function createWithdrawalLedgerEntry(
  uid: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  reference: string,
  withdrawalId: string
): Promise<string> {
  return createLedgerEntry(
    uid,
    "withdrawal",
    -amount,
    balanceBefore,
    balanceAfter,
    reference,
    { withdrawalId }
  );
}

/**
 * Crée une entrée ledger pour une mise de jeu
 */
export async function createBetLedgerEntry(
  uid: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  gameId: string,
  roomId: string
): Promise<string> {
  return createLedgerEntry(
    uid,
    "bet",
    -amount,
    balanceBefore,
    balanceAfter,
    gameId,
    { roomId }
  );
}

/**
 * Crée une entrée ledger pour un gain de jeu
 */
export async function createRewardLedgerEntry(
  uid: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  gameId: string,
  roomId: string
): Promise<string> {
  return createLedgerEntry(
    uid,
    "reward",
    amount,
    balanceBefore,
    balanceAfter,
    gameId,
    { roomId }
  );
}

/**
 * Recalcule le solde depuis le ledger
 * Utile pour la réconciliation et l'audit
 */
export async function recalculateBalanceFromLedger(
  uid: string
): Promise<number> {
  const ledgerRef = adminDB.ref(`ledger/${uid}`);
  const snapshot = await ledgerRef.once("value");

  if (!snapshot.exists()) {
    return 0;
  }

  let calculatedBalance = 0;

  snapshot.forEach((child: any) => {
    const entry = child.val();
    
    if (entry.status === "completed" && typeof entry.amount === "number") {
      calculatedBalance += entry.amount;
    }
  });

  console.log("[LEDGER] Solde recalculé:", {
    uid,
    calculatedBalance
  });

  return calculatedBalance;
}

/**
 * Vérifie la cohérence entre le solde actuel et le ledger
 */
export async function validateBalanceConsistency(
  uid: string
): Promise<{ consistent: boolean; actualBalance: number; ledgerBalance: number; difference: number }> {
  const userRef = adminDB.ref(`users/${uid}/balance`);
  const balanceSnapshot = await userRef.once("value");
  
  const actualBalance = Number(balanceSnapshot.val() || 0);
  const ledgerBalance = await recalculateBalanceFromLedger(uid);
  const difference = actualBalance - ledgerBalance;

  const consistent = Math.abs(difference) < 0.01; // Tolérance de 0.01 HTG

  if (!consistent) {
    console.error("[LEDGER] Incohérence détectée:", {
      uid,
      actualBalance,
      ledgerBalance,
      difference
    });
  }

  return {
    consistent,
    actualBalance,
    ledgerBalance,
    difference
  };
}

/**
 * Récupère l'historique ledger d'un utilisateur
 */
export async function getLedgerHistory(
  uid: string,
  limit: number = 100
): Promise<LedgerEntry[]> {
  const ledgerRef = adminDB
    .ref(`ledger/${uid}`)
    .orderByChild("createdAt")
    .limitToLast(limit);

  const snapshot = await ledgerRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const entries: LedgerEntry[] = [];

  snapshot.forEach((child: any) => {
    entries.push(child.val());
  });

  return entries.reverse();
}
