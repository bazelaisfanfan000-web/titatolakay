/*
====================================================
TiTaTo - Operation Lock System
====================================================

Système de verrouillage utilisateur pour prévenir
le double spending et les race conditions.

Une seule opération financière à la fois par utilisateur.

Opérations concernées :
- Dépôt
- Retrait
- Mise de partie
- Paiement gagnant
- Remboursement

====================================================
*/

import { adminDB } from "@/lib/firebaseAdmin";

const LOCK_TIMEOUT = 30000; // 30 secondes max pour un lock

/**
 * Tente d'acquérir un verrou d'opération pour un utilisateur
 * @param uid - ID de l'utilisateur
 * @param operationType - Type d'opération (deposit, withdraw, bet, etc.)
 * @returns true si le lock est acquis, false sinon
 */
export async function acquireOperationLock(
  uid: string,
  operationType: string
): Promise<boolean> {
  const lockRef = adminDB.ref(`users/${uid}/operationLock`);

  const result = await lockRef.transaction((current) => {
    // Si le lock existe et n'est pas expiré, on ne peut pas acquérir
    if (current) {
      const lockTimestamp = Number(current.timestamp || 0);
      const now = Date.now();
      
      // Si le lock est expiré (timeout), on peut l'acquérir
      if (now - lockTimestamp > LOCK_TIMEOUT) {
        return {
          locked: true,
          operationType,
          timestamp: now,
        };
      }
      
      // Lock actif, on ne peut pas acquérir
      return; // Abort transaction
    }

    // Aucun lock, on peut acquérir
    return {
      locked: true,
      operationType,
      timestamp: Date.now(),
    };
  });

  return result.committed;
}

/**
 * Libère le verrou d'opération pour un utilisateur
 * @param uid - ID de l'utilisateur
 */
export async function releaseOperationLock(uid: string): Promise<void> {
  await adminDB.ref(`users/${uid}/operationLock`).remove();
}

/**
 * Vérifie si un utilisateur a un lock actif
 * @param uid - ID de l'utilisateur
 * @returns true si un lock est actif, false sinon
 */
export async function hasActiveLock(uid: string): Promise<boolean> {
  const snapshot = await adminDB.ref(`users/${uid}/operationLock`).once("value");
  
  if (!snapshot.exists()) {
    return false;
  }

  const lock = snapshot.val();
  const lockTimestamp = Number(lock.timestamp || 0);
  const now = Date.now();

  // Si le lock est expiré, on considère qu'il n'est pas actif
  if (now - lockTimestamp > LOCK_TIMEOUT) {
    // Nettoyer le lock expiré
    await adminDB.ref(`users/${uid}/operationLock`).remove();
    return false;
  }

  return true;
}

/**
 * Wrapper pour exécuter une fonction avec un verrou d'opération
 * @param uid - ID de l'utilisateur
 * @param operationType - Type d'opération
 * @param fn - Fonction à exécuter
 * @returns Le résultat de la fonction
 */
export async function withOperationLock<T>(
  uid: string,
  operationType: string,
  fn: () => Promise<T>
): Promise<T> {
  const acquired = await acquireOperationLock(uid, operationType);

  if (!acquired) {
    throw new Error(
      `Opération en cours pour l'utilisateur ${uid}. Veuillez réessayer.`
    );
  }

  try {
    const result = await fn();
    return result;
  } finally {
    // Toujours libérer le lock, même en cas d'erreur
    await releaseOperationLock(uid);
  }
}

/**
 * Force la libération d'un lock expiré ou bloqué
 * À utiliser uniquement en cas d'urgence
 * @param uid - ID de l'utilisateur
 */
export async function forceReleaseLock(uid: string): Promise<void> {
  await adminDB.ref(`users/${uid}/operationLock`).remove();
}
