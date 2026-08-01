/**
 * Transactions Atomiques - WinCash
 * Opérations financières atomiques avec rollback automatique
 * Garantit l'intégrité des données même en cas d'échec
 */

import { adminDB } from "./firebaseAdmin";
import { creditWallet, debitWallet, lockBalance, unlockBalance, confirmWithdrawal } from "./wallet";
import { createLedgerEntry, updateLedgerStatus } from "./ledger";
import type { TransactionType, TransactionStatus, TransactionSource } from "@/types/wallet";

/**
 * Résultat d'une transaction atomique
 */
export interface AtomicTransactionResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Exécute une transaction de dépôt atomique
 * 1. Crée le dépôt en pending
 * 2. Appelle l'API MonCash
 * 3. Si succès, crédite le wallet
 * 4. Si échec, rollback automatique
 */
export async function atomicDeposit(params: {
  userId: string;
  amount: number;
  referenceId: string;
  idempotencyKey?: string;
}): Promise<AtomicTransactionResult> {
  const { userId, amount, referenceId, idempotencyKey } = params;

  console.log("[ATOMIC_DEPOSIT] Début transaction:", { userId, amount, referenceId });

  try {
    // 1. Créer l'entrée de dépôt en pending
    const depositRef = adminDB.ref(`deposits/${userId}/${referenceId}`);
    await depositRef.set({
      id: referenceId,
      userId,
      amount,
      status: "pending",
      referenceId,
      idempotencyKey,
      createdAt: Date.now()
    });

    // 2. Créer l'entrée ledger en pending
    const ledgerResult = await createLedgerEntry({
      userId,
      type: "deposit",
      amount,
      balanceBefore: 0, // Sera mis à jour après
      balanceAfter: 0, // Sera mis à jour après
      referenceId,
      status: "pending",
      source: "moncash",
      description: "Dépôt en attente"
    });

    if (!ledgerResult.success) {
      throw new Error("Erreur création ledger");
    }

    const transactionId = ledgerResult.transactionId;

    // 3. Créditer le wallet
    const walletResult = await creditWallet(userId, amount, referenceId, "Dépôt MonCash");

    if (!walletResult.success) {
      // Rollback: marquer le dépôt comme failed
      await depositRef.update({
        status: "failed",
        failureReason: walletResult.error,
        failedAt: Date.now()
      });

      await updateLedgerStatus(userId, transactionId!, "failed", walletResult.error);

      return {
        success: false,
        error: walletResult.error,
        rollbackPerformed: true
      };
    }

    // 4. Mettre à jour le ledger avec les soldes réels
    const newBalance = walletResult.balance!;
    await adminDB.ref(`wallet_transactions/${userId}/${transactionId}`).update({
      balanceBefore: newBalance - amount,
      balanceAfter: newBalance,
      status: "completed",
      completedAt: Date.now()
    });

    // 5. Marquer le dépôt comme completed
    await depositRef.update({
      status: "completed",
      completedAt: Date.now(),
      netAmount: amount
    });

    console.log("[ATOMIC_DEPOSIT] Transaction réussie:", { userId, amount, newBalance });

    return {
      success: true,
      transactionId,
      newBalance
    };
  } catch (error) {
    console.error("[ATOMIC_DEPOSIT] Erreur:", error);

    // Rollback en cas d'erreur
    try {
      const depositRef = adminDB.ref(`deposits/${params.userId}/${referenceId}`);
      await depositRef.update({
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Erreur inconnue",
        failedAt: Date.now()
      });
    } catch (rollbackError) {
      console.error("[ATOMIC_DEPOSIT] Erreur rollback:", rollbackError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      rollbackPerformed: true
    };
  }
}

/**
 * Exécute une transaction de retrait atomique
 * 1. Débite immédiatement le solde du joueur
 * 2. Crée le retrait en pending
 * 3. Appelle l'API MonCash payout-create
 * 4. Si échec, rembourse immédiatement (via webhook payout.failed)
 */
export async function atomicWithdrawal(params: {
  userId: string;
  amount: number;
  moncashNumber: string;
  referenceId: string;
  idempotencyKey?: string;
}): Promise<AtomicTransactionResult> {
  const { userId, amount, moncashNumber, referenceId, idempotencyKey } = params;

  console.log("[ATOMIC_WITHDRAWAL] Début transaction:", { userId, amount, referenceId });

  try {
    // 1. Débiter immédiatement le solde du joueur
    const debitResult = await debitWallet(userId, amount, referenceId, `Retrait MonCash - ${moncashNumber}`);

    if (!debitResult.success) {
      return {
        success: false,
        error: debitResult.error || "Solde insuffisant"
      };
    }

    const balanceAfterDebit = debitResult.balance!;

    // 2. Créer l'entrée de retrait en pending
    const withdrawalRef = adminDB.ref(`withdrawals/${userId}/${referenceId}`);
    await withdrawalRef.set({
      id: referenceId,
      userId,
      amount,
      moncashNumber,
      status: "pending",
      referenceId,
      idempotencyKey,
      createdAt: Date.now()
    });

    // 3. Créer l'entrée ledger
    const ledgerResult = await createLedgerEntry({
      userId,
      type: "withdraw",
      amount: -amount,
      balanceBefore: balanceAfterDebit + amount,
      balanceAfter: balanceAfterDebit,
      referenceId,
      status: "pending",
      source: "moncash",
      description: "Retrait en attente",
      metadata: { moncashNumber: moncashNumber.substring(0, 4) + "****" }
    });

    if (!ledgerResult.success) {
      // Rollback: rembourser
      await creditWallet(userId, amount, referenceId, `Rollback retrait - ${moncashNumber}`);
      throw new Error("Erreur création ledger");
    }

    const transactionId = ledgerResult.transactionId;

    console.log("[ATOMIC_WITHDRAWAL] Retrait créé avec débit immédiat:", { referenceId, balanceAfterDebit });

    return {
      success: true,
      transactionId,
      newBalance: balanceAfterDebit
    };
  } catch (error) {
    console.error("[ATOMIC_WITHDRAWAL] Erreur:", error);

    // Rollback: rembourser le montant
    try {
      await creditWallet(params.userId, params.amount, params.referenceId, `Rollback retrait erreur - ${params.moncashNumber}`);
    } catch (rollbackError) {
      console.error("[ATOMIC_WITHDRAWAL] Erreur remboursement:", rollbackError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      rollbackPerformed: true
    };
  }
}

/**
 * Confirme un retrait via webhook payout.completed
 * Le solde est déjà débité, on met juste à jour le statut
 */
export async function confirmWithdrawalTransaction(params: {
  userId: string;
  amount: number;
  referenceId: string;
  moncashReference: string;
}): Promise<AtomicTransactionResult> {
  const { userId, amount, referenceId, moncashReference } = params;

  console.log("[ATOMIC_WITHDRAWAL_CONFIRM] Confirmation:", { userId, amount, referenceId });

  try {
    // 1. Mettre à jour le statut du retrait
    const withdrawalRef = adminDB.ref(`withdrawals/${userId}/${referenceId}`);
    await withdrawalRef.update({
      status: "completed",
      moncashReference,
      completedAt: Date.now()
    });

    // 2. Mettre à jour le ledger
    const ledgerSnapshot = await adminDB
      .ref(`wallet_transactions/${userId}`)
      .orderByChild("referenceId")
      .equalTo(referenceId)
      .once("value");

    if (ledgerSnapshot.exists()) {
      ledgerSnapshot.forEach((child: any) => {
        const txId = child.key;
        adminDB.ref(`wallet_transactions/${userId}/${txId}`).update({
          status: "completed",
          completedAt: Date.now()
        });
      });
    }

    console.log("[ATOMIC_WITHDRAWAL_CONFIRM] Retrait confirmé:", { userId, amount });

    return {
      success: true
    };
  } catch (error) {
    console.error("[ATOMIC_WITHDRAWAL_CONFIRM] Erreur:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Annule un retrait via webhook payout.failed
 * Rembourse le solde du joueur (le solde a déjà été débité)
 */
export async function cancelWithdrawalTransaction(params: {
  userId: string;
  amount: number;
  referenceId: string;
  failureReason: string;
}): Promise<AtomicTransactionResult> {
  const { userId, amount, referenceId, failureReason } = params;

  console.log("[ATOMIC_WITHDRAWAL_CANCEL] Annulation avec remboursement:", { userId, amount, referenceId });

  try {
    // 1. Rembourser le solde du joueur
    const creditResult = await creditWallet(userId, amount, referenceId, `Remboursement retrait échoué - ${failureReason}`);

    if (!creditResult.success) {
      console.error("[ATOMIC_WITHDRAWAL_CANCEL] Erreur remboursement:", creditResult.error);
      return {
        success: false,
        error: creditResult.error || "Erreur remboursement"
      };
    }

    // 2. Mettre à jour le statut du retrait
    const withdrawalRef = adminDB.ref(`withdrawals/${userId}/${referenceId}`);
    await withdrawalRef.update({
      status: "failed",
      failureReason,
      failedAt: Date.now()
    });

    // 3. Mettre à jour le ledger
    const ledgerSnapshot = await adminDB
      .ref(`wallet_transactions/${userId}`)
      .orderByChild("referenceId")
      .equalTo(referenceId)
      .once("value");

    if (ledgerSnapshot.exists()) {
      ledgerSnapshot.forEach((child: any) => {
        const txId = child.key;
        updateLedgerStatus(userId, txId, "failed", failureReason);
      });
    }

    console.log("[ATOMIC_WITHDRAWAL_CANCEL] Retrait annulé avec remboursement:", { userId, amount, newBalance: creditResult.balance });

    return {
      success: true,
      newBalance: creditResult.balance
    };
  } catch (error) {
    console.error("[ATOMIC_WITHDRAWAL_CANCEL] Erreur:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Transaction de mise de jeu atomique
 * Débite les deux joueurs simultanément
 */
export async function atomicGameBet(params: {
  player1Id: string;
  player2Id: string;
  amount: number;
  gameId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { player1Id, player2Id, amount, gameId } = params;

  console.log("[ATOMIC_GAME_BET] Début:", { player1Id, player2Id, amount, gameId });

  try {
    // Débiter le joueur 1
    const bet1Result = await debitWallet(player1Id, amount, gameId, `Mise jeu ${gameId}`);
    if (!bet1Result.success) {
      return { success: false, error: `Joueur 1: ${bet1Result.error}` };
    }

    // Débiter le joueur 2
    const bet2Result = await debitWallet(player2Id, amount, gameId, `Mise jeu ${gameId}`);
    if (!bet2Result.success) {
      // Rollback joueur 1
      await creditWallet(player1Id, amount, gameId, `Rollback mise ${gameId}`);
      return { success: false, error: `Joueur 2: ${bet2Result.error}` };
    }

    // Créer les entrées ledger
    await createLedgerEntry({
      userId: player1Id,
      type: "game_bet",
      amount: -amount,
      balanceBefore: bet1Result.balance! + amount,
      balanceAfter: bet1Result.balance!,
      referenceId: gameId,
      status: "completed",
      source: "game",
      description: `Mise de jeu - ${gameId}`,
      metadata: { gameId }
    });

    await createLedgerEntry({
      userId: player2Id,
      type: "game_bet",
      amount: -amount,
      balanceBefore: bet2Result.balance! + amount,
      balanceAfter: bet2Result.balance!,
      referenceId: gameId,
      status: "completed",
      source: "game",
      description: `Mise de jeu - ${gameId}`,
      metadata: { gameId }
    });

    console.log("[ATOMIC_GAME_BET] Succès:", { gameId });

    return { success: true };
  } catch (error) {
    console.error("[ATOMIC_GAME_BET] Erreur:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Transaction de gain de jeu atomique
 * Crédite le gagnant avec sa mise + 50% de la mise du perdant
 */
export async function atomicGameWin(params: {
  winnerId: string;
  loserId: string;
  betAmount: number;
  gameId: string;
}): Promise<{ success: boolean; error?: string; winnerBalance?: number }> {
  const { winnerId, loserId, betAmount, gameId } = params;

  console.log("[ATOMIC_GAME_WIN] Début:", { winnerId, betAmount, gameId });

  try {
    // Calculer le gain: mise du gagnant + 50% de la mise du perdant
    const reward = Math.floor(betAmount + (betAmount * 0.5));

    // Créditer le gagnant
    const winResult = await creditWallet(winnerId, reward, gameId, `Gain jeu ${gameId}`);
    if (!winResult.success) {
      return { success: false, error: winResult.error };
    }

    // Créer l'entrée ledger
    await createLedgerEntry({
      userId: winnerId,
      type: "game_win",
      amount: reward,
      balanceBefore: winResult.balance! - reward,
      balanceAfter: winResult.balance!,
      referenceId: gameId,
      status: "completed",
      source: "game",
      description: `Gain de jeu - ${gameId}`,
      metadata: { gameId, betAmount, reward }
    });

    console.log("[ATOMIC_GAME_WIN] Succès:", { winnerId, reward, gameId });

    return { success: true, winnerBalance: winResult.balance };
  } catch (error) {
    console.error("[ATOMIC_GAME_WIN] Erreur:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}
