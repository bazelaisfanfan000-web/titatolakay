/**
 * Firebase Withdrawal Utilities
 * Module pour gérer les opérations de retrait dans Firebase Realtime Database
 */

import { adminDB } from "@/lib/firebaseAdmin";

export interface WithdrawalData {
  withdrawalId: string;
  referenceId: string;
  payoutReference: string | null;
  amount: number;
  status: "pending" | "completed" | "failed";
  moncashNumber: string;
  createdAt: number;
  completedAt: number | null;
  failedAt: number | null;
  error: string | null;
  failureReason: string | null;
  fee_htg: number | null;
  net_htg: number | null;
}

/**
 * Récupère tous les retraits d'un utilisateur
 */
export async function getWithdrawals(userId: string): Promise<WithdrawalData[]> {
  console.log("[WITHDRAWAL_DB] Récupération retraits pour:", userId);
  
  const snapshot = await adminDB.ref(`withdrawals/${userId}`).once("value");
  
  if (!snapshot.exists()) {
    console.log("[WITHDRAWAL_DB] Aucun retrait trouvé pour:", userId);
    return [];
  }

  const withdrawals: WithdrawalData[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val() as WithdrawalData;
    withdrawals.push(data);
  });

  console.log("[WITHDRAWAL_DB] Retraits récupérés:", withdrawals.length);
  // Trier par date décroissante (plus récent en premier)
  return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Récupère un retrait spécifique par son ID
 */
export async function getWithdrawalById(
  userId: string,
  withdrawalId: string
): Promise<WithdrawalData | null> {
  console.log("[WITHDRAWAL_DB] Récupération retrait:", withdrawalId);
  
  const snapshot = await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).once("value");
  
  if (!snapshot.exists()) {
    console.log("[WITHDRAWAL_DB] Retrait non trouvé:", withdrawalId);
    return null;
  }

  const data = snapshot.val() as WithdrawalData;
  console.log("[WITHDRAWAL_DB] Retrait trouvé:", data);
  return data;
}

/**
 * Met à jour le statut et les données d'un retrait
 */
export async function updateWithdrawalStatus(
  userId: string,
  withdrawalId: string,
  status: "pending" | "completed" | "failed",
  data?: Partial<WithdrawalData>
): Promise<void> {
  console.log("[WITHDRAWAL_DB] Mise à jour retrait:", { userId, withdrawalId, status });
  
  const updates: Partial<WithdrawalData> = {
    status,
    ...data,
  };

  // Ajouter timestamp approprié selon le statut
  if (status === "completed") {
    updates.completedAt = Date.now();
  } else if (status === "failed") {
    updates.failedAt = Date.now();
  }

  await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).update(updates);
  console.log("[WITHDRAWAL_DB] Retrait mis à jour:", { withdrawalId, status });
}

/**
 * Trouve un retrait en attente par sa référence de payout MonCash
 * Utilisé par le webhook pour traiter les événements payout.completed/failed
 */
export async function findWithdrawalByPayoutReference(
  payoutReference: string
): Promise<{ userId: string; withdrawalId: string; withdrawal: WithdrawalData } | null> {
  console.log("[WITHDRAWAL_DB] Recherche retrait par payoutReference:", payoutReference);
  
  // Rechercher dans tous les utilisateurs (peut être optimisé avec un index)
  const withdrawalsRef = adminDB.ref("withdrawals");
  const snapshot = await withdrawalsRef.once("value");
  
  if (!snapshot.exists()) {
    console.log("[WITHDRAWAL_DB] Aucun retrait trouvé dans la base");
    return null;
  }

  let found: { userId: string; withdrawalId: string; withdrawal: WithdrawalData } | null = null;

  snapshot.forEach((userSnapshot) => {
    if (found) return; // Arrêter si déjà trouvé
    
    const userId = userSnapshot.key;
    if (!userId) return;

    userSnapshot.forEach((withdrawalSnapshot) => {
      if (found) return;
      
      const withdrawalId = withdrawalSnapshot.key;
      const withdrawal = withdrawalSnapshot.val() as WithdrawalData;
      
      if (withdrawal.payoutReference === payoutReference && withdrawal.status === "pending") {
        found = {
          userId,
          withdrawalId: withdrawalId || "",
          withdrawal,
        };
        console.log("[WITHDRAWAL_DB] Retrait trouvé:", { userId, withdrawalId, payoutReference });
      }
    });
  });

  if (!found) {
    console.log("[WITHDRAWAL_DB] Aucun retrait en attente trouvé pour:", payoutReference);
  }

  return found;
}

/**
 * Crée un index de recherche pour les retraits par payoutReference
 * Utile pour optimiser les recherches webhook
 */
export async function createWithdrawalIndex(
  userId: string,
  withdrawalId: string,
  payoutReference: string
): Promise<void> {
  console.log("[WITHDRAWAL_DB] Création index retrait:", { userId, withdrawalId, payoutReference });
  
  await adminDB.ref(`withdrawal_index/${payoutReference}`).set({
    userId,
    withdrawalId,
    createdAt: Date.now(),
  });
  
  console.log("[WITHDRAWAL_DB] Index créé avec succès");
}

/**
 * Trouve un retrait via l'index (plus rapide que la recherche complète)
 */
export async function findWithdrawalByIndex(
  payoutReference: string
): Promise<{ userId: string; withdrawalId: string } | null> {
  console.log("[WITHDRAWAL_DB] Recherche via index:", payoutReference);
  
  const snapshot = await adminDB.ref(`withdrawal_index/${payoutReference}`).once("value");
  
  if (!snapshot.exists()) {
    console.log("[WITHDRAWAL_DB] Index non trouvé pour:", payoutReference);
    return null;
  }

  const data = snapshot.val() as { userId: string; withdrawalId: string };
  console.log("[WITHDRAWAL_DB] Index trouvé:", data);
  return data;
}

/**
 * Supprime l'index après traitement du retrait
 */
export async function deleteWithdrawalIndex(payoutReference: string): Promise<void> {
  console.log("[WITHDRAWAL_DB] Suppression index:", payoutReference);
  await adminDB.ref(`withdrawal_index/${payoutReference}`).remove();
  console.log("[WITHDRAWAL_DB] Index supprimé");
}
