/**
 * Module de Déduplication et Anti-Replay
 * Empêche le traitement multiple des mêmes événements
 */

import { adminDB } from "./firebaseAdmin";

/**
 * Vérifie si un événement a déjà été traité
 * @param eventId Identifiant unique de l'événement
 * @returns true si déjà traité, false sinon
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const eventRef = adminDB.ref(`processed_events/${eventId}`);
    const snapshot = await eventRef.once("value");
    return snapshot.exists();
  } catch (error) {
    console.error("[DEDUP] Erreur vérification événement:", error);
    return false;
  }
}

/**
 * Marque un événement comme traité
 * @param eventId Identifiant unique de l'événement
 * @param eventType Type de l'événement
 * @param reference Reference de la transaction
 * @param userId ID utilisateur (optionnel)
 */
export async function markEventProcessed(
  eventId: string,
  eventType: string,
  reference: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = adminDB.ref(`processed_events/${eventId}`);
    
    // Vérifier d'abord si déjà traité (race condition)
    const snapshot = await eventRef.once("value");
    if (snapshot.exists()) {
      return { success: true }; // Déjà traité, pas d'erreur
    }

    await eventRef.set({
      eventId,
      eventType,
      reference,
      userId,
      processedAt: Date.now()
    });

    console.log("[DEDUP] Événement marqué comme traité:", { eventId, eventType });
    return { success: true };
  } catch (error) {
    console.error("[DEDUP] Erreur marquage événement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Génère un ID d'événement unique pour la déduplication
 * @param eventType Type de l'événement
 * @param reference Reference de la transaction
 * @param timestamp Timestamp de l'événement
 */
export function generateEventId(
  eventType: string,
  reference: string,
  timestamp: string
): string {
  return `${eventType}_${reference}_${timestamp}`;
}

/**
 * Nettoie les anciens événements traités (plus de 30 jours)
 * À appeler périodiquement via un cron job
 */
export async function cleanupOldProcessedEvents(): Promise<{ deleted: number; error?: string }> {
  try {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 jours
    const eventsRef = adminDB.ref("processed_events");
    const snapshot = await eventsRef.once("value");

    if (!snapshot.exists()) {
      return { deleted: 0 };
    }

    let deleted = 0;
    const updates: Record<string, null> = {};

    snapshot.forEach((child: any) => {
      const event = child.val();
      if (event.processedAt < cutoffTime) {
        updates[child.key] = null;
        deleted++;
      }
    });

    if (Object.keys(updates).length > 0) {
      await eventsRef.update(updates);
      console.log("[DEDUP] Nettoyage anciens événements:", { deleted });
    }

    return { deleted };
  } catch (error) {
    console.error("[DEDUP] Erreur nettoyage:", error);
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Vérifie si une transaction avec un referenceId existe déjà
 * Pour la déduplication côté client
 */
export async function transactionExistsByReference(
  referenceId: string
): Promise<boolean> {
  try {
    // Vérifier dans les dépôts
    const depositsRef = adminDB.ref("deposits");
    const depositSnapshot = await depositsRef
      .orderByChild("referenceId")
      .equalTo(referenceId)
      .once("value");

    if (depositSnapshot.exists()) {
      return true;
    }

    // Vérifier dans les retraits
    const withdrawalsRef = adminDB.ref("withdrawals");
    const withdrawalSnapshot = await withdrawalsRef
      .orderByChild("referenceId")
      .equalTo(referenceId)
      .once("value");

    if (withdrawalSnapshot.exists()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("[DEDUP] Erreur vérification reference:", error);
    return false;
  }
}

/**
 * Lock distribué pour empêcher les doubles traitements concurrents
 * Utilise Firebase Realtime Database pour le locking
 */
export class DistributedLock {
  private lockRef: any;
  private lockId: string;
  private acquired: boolean = false;

  constructor(lockKey: string) {
    this.lockRef = adminDB.ref(`locks/${lockKey}`);
    this.lockId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Tente d'acquérir le lock
   * @param timeout Temps d'attente en ms (défaut: 5000)
   * @param ttl Durée du lock en ms (défaut: 10000)
   */
  async acquire(timeout: number = 5000, ttl: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.lockRef.transaction((current: any) => {
        // Si le lock n'existe pas ou est expiré, l'acquérir
        if (!current || (current.expiresAt && current.expiresAt < Date.now())) {
          return {
            lockId: this.lockId,
            acquiredAt: Date.now(),
            expiresAt: Date.now() + ttl
          };
        }
        return; // Lock déjà pris
      });

      if (result.committed) {
        const lockData = result.snapshot.val();
        if (lockData && lockData.lockId === this.lockId) {
          this.acquired = true;
          console.log("[LOCK] Lock acquis:", this.lockId);
          return true;
        }
      }

      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.warn("[LOCK] Timeout acquisition lock");
    return false;
  }

  /**
   * Libère le lock
   */
  async release(): Promise<void> {
    if (!this.acquired) {
      return;
    }

    try {
      const result = await this.lockRef.transaction((current: any) => {
        if (current && current.lockId === this.lockId) {
          return null; // Libérer le lock
        }
        return; // Lock déjà pris par quelqu'un d'autre
      });

      if (result.committed) {
        this.acquired = false;
        console.log("[LOCK] Lock libéré:", this.lockId);
      }
    } catch (error) {
      console.error("[LOCK] Erreur libération lock:", error);
    }
  }

  /**
   * Vérifie si le lock est acquis
   */
  isLocked(): boolean {
    return this.acquired;
  }
}

/**
 * Wrapper pour exécuter une fonction avec un lock distribué
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  timeout: number = 5000,
  ttl: number = 10000
): Promise<T> {
  const lock = new DistributedLock(lockKey);

  try {
    const acquired = await lock.acquire(timeout, ttl);
    if (!acquired) {
      throw new Error("Impossible d'acquérir le lock");
    }

    return await fn();
  } finally {
    await lock.release();
  }
}
