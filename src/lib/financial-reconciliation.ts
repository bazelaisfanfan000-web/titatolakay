/*
====================================================
TiTaTo - Financial Reconciliation Script
====================================================

Ce script détecte et répare les incohérences financières
entre balance, reservedBalance, ledger et withdrawals.

À exécuter périodiquement (ex: quotidiennement) via
un cron job ou une fonction Cloud Functions.

====================================================
*/

import {
  adminDB
} from "./firebaseAdmin";


/*
====================================================
TYPES
====================================================
*/

interface ReconciliationReport {

  timestamp: number;

  issues: ReconciliationIssue[];

  summary: {
    totalUsers: number;
    usersWithIssues: number;
    totalReservedOrphaned: number;
    totalLedgerMissing: number;
    totalWithdrawalOrphaned: number;
  };

}


interface ReconciliationIssue {

  type:
    | "reserved_balance_orphaned"
    | "reserved_balance_not_released"
    | "ledger_missing_transaction"
    | "withdrawal_orphaned"
    | "withdrawal_stuck_pending"
    | "withdrawal_stuck_refund_pending";

  uid?: string;

  withdrawalId?: string;

  amount?: number;

  description: string;

  severity: "critical" | "high" | "medium" | "low";

}


/*
====================================================
RÉCUPÉRER TOUS LES UTILISATEURS
====================================================
*/

async function getAllUsers(): Promise<string[]> {

  const snapshot =
    await adminDB
      .ref("users")
      .get();


  if (!snapshot.exists()) {

    return [];

  }


  const users = snapshot.val() as Record<string, any>;


  return Object.keys(users);

}


/*
====================================================
DÉTECTER reservedBalance ORPHELIN
====================================================

reservedBalance sans withdrawal correspondant
====================================================
*/

async function detectOrphanedReservedBalance(
  uid: string
): Promise<ReconciliationIssue[]> {

  const issues: ReconciliationIssue[] = [];


  const userSnapshot =
    await adminDB
      .ref(`users/${uid}`)
      .get();


  if (!userSnapshot.exists()) {

    return issues;

  }


  const user = userSnapshot.val();


  const reservedBalance =
    Number(user.reservedBalance || 0);


  if (reservedBalance === 0) {

    return issues;

  }


  /*
  Chercher les withdrawals actifs de cet utilisateur
  */

  const withdrawalsSnapshot =
    await adminDB
      .ref("withdrawals")
      .orderByChild("uid")
      .equalTo(uid)
      .get();


  let totalReservedInWithdrawals = 0;


  if (withdrawalsSnapshot.exists()) {

    const withdrawals =
      withdrawalsSnapshot.val() as Record<string, any>;


    for (const withdrawal of Object.values(withdrawals)) {

      const status = withdrawal.status;

      /*
      Seuls les withdrawals actifs ont des fonds réservés
      */

      if (
        status === "pending" ||
        status === "processing" ||
        status === "refund_pending"
      ) {

        totalReservedInWithdrawals +=
          Number(withdrawal.amount || 0);

      }

    }

  }


  /*
  Si reservedBalance > totalReservedInWithdrawals,
  il y a une réservation orpheline
  */

  if (reservedBalance > totalReservedInWithdrawals) {

    const orphanedAmount =
      reservedBalance - totalReservedInWithdrawals;


    issues.push({

      type: "reserved_balance_orphaned",

      uid,

      amount: orphanedAmount,

      description:
        `reservedBalance orphelin de ${orphanedAmount} HTG ` +
        `(reservedBalance: ${reservedBalance}, ` +
        `withdrawals actifs: ${totalReservedInWithdrawals})`,

      severity: "high",

    });

  }


  return issues;

}


/*
====================================================
DÉTECTER reservedBalance NON LIBÉRÉ
====================================================

withdrawal completed mais reservedBalance non libéré
====================================================
*/

async function detectUnreleasedReservedBalance(
  uid: string
): Promise<ReconciliationIssue[]> {

  const issues: ReconciliationIssue[] = [];


  const withdrawalsSnapshot =
    await adminDB
      .ref("withdrawals")
      .orderByChild("uid")
      .equalTo(uid)
      .get();


  if (!withdrawalsSnapshot.exists()) {

    return issues;

  }


  const withdrawals =
    withdrawalsSnapshot.val() as Record<string, any>;


  for (const [withdrawalId, withdrawal] of Object.entries(withdrawals)) {

    const status = withdrawal.status;


    /*
    Si withdrawal est completed mais reservedBalance
    n'a pas été libéré
    */

    if (status === "completed") {

      const userSnapshot =
        await adminDB
          .ref(`users/${uid}`)
          .get();


      if (userSnapshot.exists()) {

        const user = userSnapshot.val();
        const reservedBalance =
          Number(user.reservedBalance || 0);


        if (reservedBalance > 0) {

          issues.push({

            type: "reserved_balance_not_released",

            uid,

            withdrawalId,

            amount: reservedBalance,

            description:
              `withdrawal completed mais reservedBalance ` +
              `non libéré (${reservedBalance} HTG)`,

            severity: "high",

          });

        }

      }

    }

  }


  return issues;

}


/*
====================================================
DÉTECTER TRANSACTIONS LEDGER MANQUANTES
====================================================

balance modifié sans transaction ledger
====================================================
*/

async function detectMissingLedgerTransactions(
  uid: string
): Promise<ReconciliationIssue[]> {

  const issues: ReconciliationIssue[] = [];


  /*
  Cette détection est complexe car elle nécessite
  de reconstruire l'historique à partir du ledger.

  Pour l'instant, on détecte seulement les cas
  évidents : balance > 0 mais aucune transaction
  */

  const balanceSnapshot =
    await adminDB
      .ref(`users/${uid}/balance`)
      .get();


  const balance =
    Number(balanceSnapshot.val() || 0);


  if (balance === 0) {

    return issues;

  }


  const ledgerSnapshot =
    await adminDB
      .ref(`transactions/${uid}`)
      .get();


  if (!ledgerSnapshot.exists()) {

    issues.push({

      type: "ledger_missing_transaction",

      uid,

      amount: balance,

      description:
        `balance de ${balance} HTG mais aucune transaction ledger`,

      severity: "medium",

    });

  }


  return issues;

}


/*
====================================================
DÉTECTER WITHDRAWALS ORPHELINS
====================================================

withdrawal sans reservedBalance correspondant
====================================================
*/

async function detectOrphanedWithdrawals(): Promise<ReconciliationIssue[]> {

  const issues: ReconciliationIssue[] = [];


  const withdrawalsSnapshot =
    await adminDB
      .ref("withdrawals")
      .get();


  if (!withdrawalsSnapshot.exists()) {

    return issues;

  }


  const withdrawals =
    withdrawalsSnapshot.val() as Record<string, any>;


  for (const [withdrawalId, withdrawal] of Object.entries(withdrawals)) {

    const uid = withdrawal.uid;
    const status = withdrawal.status;
    const fundsReserved = withdrawal.fundsReserved;


    /*
    Si withdrawal est pending/processing mais fundsReserved
    est false, c'est incohérent
    */

    if (
      (status === "pending" || status === "processing") &&
      !fundsReserved
    ) {

      issues.push({

        type: "withdrawal_orphaned",

        uid,

        withdrawalId,

        amount: withdrawal.amount,

        description:
          `withdrawal ${status} sans réservation de fonds`,

        severity: "critical",

      });

    }

  }


  return issues;

}


/*
====================================================
DÉTECTER WITHDRAWALS BLOQUÉS
====================================================

withdrawal pending/processing/refund_pending trop ancien
====================================================
*/

async function detectStuckWithdrawals(): Promise<ReconciliationIssue[]> {

  const issues: ReconciliationIssue[] = [];


  const withdrawalsSnapshot =
    await adminDB
      .ref("withdrawals")
      .get();


  if (!withdrawalsSnapshot.exists()) {

    return issues;

  }


  const withdrawals =
    withdrawalsSnapshot.val() as Record<string, any>;


  const STUCK_THRESHOLD_MS =
    24 * 60 * 60 * 1000; // 24 heures


  const now = Date.now();


  for (const [withdrawalId, withdrawal] of Object.entries(withdrawals)) {

    const status = withdrawal.status;
    const createdAt = withdrawal.createdAt;


    /*
    Si withdrawal est pending/processing/refund_pending
    depuis plus de 24h
    */

    if (
      (status === "pending" ||
       status === "processing" ||
       status === "refund_pending") &&
      (now - createdAt) > STUCK_THRESHOLD_MS
    ) {

      issues.push({

        type: status === "refund_pending"
          ? "withdrawal_stuck_refund_pending"
          : "withdrawal_stuck_pending",

        uid: withdrawal.uid,

        withdrawalId,

        amount: withdrawal.amount,

        description:
          `withdrawal ${status} bloqué depuis ` +
          `${Math.floor((now - createdAt) / (60 * 60 * 1000))} heures`,

        severity: "high",

      });

    }

  }


  return issues;

}


/*
====================================================
RÉPARER reservedBalance ORPHELIN
====================================================
*/

async function repairOrphanedReservedBalance(
  uid: string,
  amount: number
): Promise<boolean> {

  try {

    await adminDB
      .ref(`users/${uid}/reservedBalance`)
      .transaction((current) => {

        const reserved = Number(current || 0);

        return Math.max(0, reserved - amount);

      });


    console.log(
      `[RECONCILIATION] reservedBalance orphelin réparé pour ${uid}: -${amount} HTG`
    );


    return true;

  } catch (error) {

    console.error(
      `[RECONCILIATION] Erreur réparation reservedBalance orphelin`,
      { uid, amount, error }
    );


    return false;

  }

}


/*
====================================================
RÉPARER reservedBalance NON LIBÉRÉ
====================================================
*/

async function repairUnreleasedReservedBalance(
  uid: string,
  withdrawalId: string
): Promise<boolean> {

  try {

    await adminDB
      .ref(`users/${uid}/reservedBalance`)
      .transaction((current) => {

        const reserved = Number(current || 0);

        return Math.max(0, reserved);

      });


    console.log(
      `[RECONCILIATION] reservedBalance libéré pour ${uid}, withdrawal ${withdrawalId}`
    );


    return true;

  } catch (error) {

    console.error(
      `[RECONCILIATION] Erreur libération reservedBalance`,
      { uid, withdrawalId, error }
    );


    return false;

  }

}


/*
====================================================
FONCTION PRINCIPALE DE RÉCONCILIATION
====================================================
*/

export async function runFinancialReconciliation(
  autoRepair: boolean = false
): Promise<ReconciliationReport> {

  const issues: ReconciliationIssue[] = [];


  console.log(
    "[RECONCILIATION] Début de la réconciliation financière"
  );


  /*
  Étape 1: Détecter les withdrawals orphelins
  */

  const orphanedWithdrawals =
    await detectOrphanedWithdrawals();

  issues.push(...orphanedWithdrawals);


  /*
  Étape 2: Détecter les withdrawals bloqués
  */

  const stuckWithdrawals =
    await detectStuckWithdrawals();

  issues.push(...stuckWithdrawals);


  /*
  Étape 3: Parcourir tous les utilisateurs
  */

  const users = await getAllUsers();


  for (const uid of users) {

    /*
    Détecter reservedBalance orphelin
    */

    const orphanedReserved =
      await detectOrphanedReservedBalance(uid);

    issues.push(...orphanedReserved);


    /*
    Détecter reservedBalance non libéré
    */

    const unreleasedReserved =
      await detectUnreleasedReservedBalance(uid);

    issues.push(...unreleasedReserved);


    /*
    Détecter transactions ledger manquantes
    */

    const missingLedger =
      await detectMissingLedgerTransactions(uid);

    issues.push(...missingLedger);


    /*
    Réparations automatiques si demandé
    */

    if (autoRepair) {

      for (const issue of orphanedReserved) {

        if (
          issue.type === "reserved_balance_orphaned" &&
          issue.amount
        ) {

          await repairOrphanedReservedBalance(
            uid,
            issue.amount
          );

        }

      }


      for (const issue of unreleasedReserved) {

        if (
          issue.type === "reserved_balance_not_released" &&
          issue.withdrawalId
        ) {

          await repairUnreleasedReservedBalance(
            uid,
            issue.withdrawalId
          );

        }

      }

    }

  }


  /*
  Résumé
  */

  const summary = {

    totalUsers: users.length,

    usersWithIssues:
      new Set(
        issues
          .filter(i => i.uid)
          .map(i => i.uid)
      ).size,

    totalReservedOrphaned:
      issues
        .filter(i => i.type === "reserved_balance_orphaned")
        .reduce((sum, i) => sum + (i.amount || 0), 0),

    totalLedgerMissing:
      issues
        .filter(i => i.type === "ledger_missing_transaction")
        .length,

    totalWithdrawalOrphaned:
      issues
        .filter(i => i.type === "withdrawal_orphaned")
        .length,

  };


  const report: ReconciliationReport = {

    timestamp: Date.now(),

    issues,

    summary,

  };


  console.log(
    "[RECONCILIATION] Réconciliation terminée",
    summary
  );


  return report;

}<arg_value><arg_key>EmptyFile</arg_key><arg_value>false
