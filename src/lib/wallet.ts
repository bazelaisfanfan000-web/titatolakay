/**
 * Système Wallet Atomique - PlayToWin
 * Gestion sécurisée et atomique des soldes avec Firebase Realtime Database
 */

import { adminDB } from "./firebaseAdmin";
import type { Wallet, BalanceResult } from "@/types/wallet";

/**
 * Crée un wallet pour un utilisateur (si inexistant)
 * Transaction atomique
 */
export async function createWallet(uid: string): Promise<Wallet> {
  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (current) {
      // Le wallet existe déjà, le retourner inchangé
      return current;
    }

    // Créer un nouveau wallet
    return {
      balance: 0,
      lockedBalance: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    throw new Error("Échec de la création du wallet");
  }

  return {
    balance: Number(result.snapshot.val()?.balance || 0),
    lockedBalance: Number(result.snapshot.val()?.lockedBalance || 0),
    createdAt: result.snapshot.val()?.createdAt || Date.now(),
    updatedAt: result.snapshot.val()?.updatedAt || Date.now()
  };
}

/**
 * Lit le wallet d'un utilisateur
 */
export async function getWallet(uid: string): Promise<Wallet | null> {
  const userRef = adminDB.ref(`users/${uid}`);
  const snapshot = await userRef.once("value");

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  return {
    balance: Number(data.balance || 0),
    lockedBalance: Number(data.lockedBalance || 0),
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now()
  };
}

/**
 * Récupère le solde disponible (balance - lockedBalance)
 */
export async function getAvailableBalance(uid: string): Promise<number> {
  const wallet = await getWallet(uid);
  if (!wallet) return 0;
  return Math.max(0, wallet.balance - wallet.lockedBalance);
}

/**
 * Vérifie si l'utilisateur a un solde suffisant
 */
export async function hasAvailableBalance(uid: string, amount: number): Promise<boolean> {
  const available = await getAvailableBalance(uid);
  return available >= amount;
}

/**
 * Crédite le wallet de manière atomique
 * Utilisé pour les dépôts, gains de jeu, remboursements
 */
export async function creditWallet(
  uid: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<BalanceResult> {
  if (amount <= 0) {
    return { success: false, error: "Le montant doit être positif" };
  }

  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      // Créer le wallet s'il n'existe pas
      return {
        balance: amount,
        lockedBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    return {
      ...current,
      balance: Number(current.balance || 0) + amount,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Transaction Firebase échouée" };
  }

  const newBalance = result.snapshot.val()?.balance || 0;
  console.log("[WALLET] Crédit réussi:", { uid, amount, newBalance, referenceId });

  return { success: true, balance: newBalance };
}

/**
 * Débite le wallet de manière atomique
 * Utilisé pour les retraits, mises de jeu
 */
export async function debitWallet(
  uid: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<BalanceResult> {
  if (amount <= 0) {
    return { success: false, error: "Le montant doit être positif" };
  }

  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      return; // Annuler si le wallet n'existe pas
    }

    const balance = Number(current.balance || 0);
    const lockedBalance = Number(current.lockedBalance || 0);
    const available = balance - lockedBalance;

    if (available < amount) {
      return; // Annuler si solde insuffisant
    }

    return {
      ...current,
      balance: balance - amount,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Solde insuffisant ou transaction échouée" };
  }

  const newBalance = result.snapshot.val()?.balance || 0;
  console.log("[WALLET] Débit réussi:", { uid, amount, newBalance, referenceId });

  return { success: true, balance: newBalance };
}

/**
 * Verrouille un montant pour un retrait en attente
 * Le montant est déplacé de balance vers lockedBalance
 */
export async function lockBalance(
  uid: string,
  amount: number,
  referenceId: string
): Promise<BalanceResult> {
  if (amount <= 0) {
    return { success: false, error: "Le montant doit être positif" };
  }

  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      return; // Annuler si le wallet n'existe pas
    }

    const balance = Number(current.balance || 0);
    const lockedBalance = Number(current.lockedBalance || 0);
    const available = balance - lockedBalance;

    if (available < amount) {
      return; // Annuler si solde insuffisant
    }

    return {
      ...current,
      lockedBalance: lockedBalance + amount,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Solde insuffisant ou transaction échouée" };
  }

  const data = result.snapshot.val();
  console.log("[WALLET] Verrouillage réussi:", { uid, amount, referenceId });

  return {
    success: true,
    balance: Number(data?.balance || 0),
    lockedBalance: Number(data?.lockedBalance || 0)
  };
}

/**
 * Déverrouille un montant (annulation de retrait)
 * Le montant est remis de lockedBalance vers balance
 */
export async function unlockBalance(
  uid: string,
  amount: number,
  referenceId: string
): Promise<BalanceResult> {
  if (amount <= 0) {
    return { success: false, error: "Le montant doit être positif" };
  }

  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      return; // Annuler si le wallet n'existe pas
    }

    const lockedBalance = Number(current.lockedBalance || 0);

    if (lockedBalance < amount) {
      return; // Annuler si montant verrouillé insuffisant
    }

    return {
      ...current,
      lockedBalance: lockedBalance - amount,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Transaction échouée" };
  }

  const data = result.snapshot.val();
  console.log("[WALLET] Déverrouillage réussi:", { uid, amount, referenceId });

  return {
    success: true,
    balance: Number(data?.balance || 0),
    lockedBalance: Number(data?.lockedBalance || 0)
  };
}

/**
 * Confirme un retrait en débitant le montant verrouillé
 * Débite balance et déverrouille lockedBalance
 */
export async function confirmWithdrawal(
  uid: string,
  amount: number,
  referenceId: string
): Promise<BalanceResult> {
  if (amount <= 0) {
    return { success: false, error: "Le montant doit être positif" };
  }

  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      return; // Annuler si le wallet n'existe pas
    }

    const balance = Number(current.balance || 0);
    const lockedBalance = Number(current.lockedBalance || 0);

    if (lockedBalance < amount) {
      return; // Annuler si montant verrouillé insuffisant
    }

    if (balance < amount) {
      return; // Annuler si balance insuffisante
    }

    return {
      ...current,
      balance: balance - amount,
      lockedBalance: lockedBalance - amount,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Transaction échouée" };
  }

  const data = result.snapshot.val();
  console.log("[WALLET] Retrait confirmé:", { uid, amount, referenceId });

  return {
    success: true,
    balance: Number(data?.balance || 0),
    lockedBalance: Number(data?.lockedBalance || 0)
  };
}

/**
 * Ajustement administratif du solde (avec audit)
 * À utiliser uniquement par les administrateurs
 */
export async function adminAdjustBalance(
  uid: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<BalanceResult> {
  const userRef = adminDB.ref(`users/${uid}`);

  const result = await userRef.transaction((current: any) => {
    if (!current) {
      return {
        balance: Math.max(0, amount),
        lockedBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    const currentBalance = Number(current.balance || 0);
    const newBalance = Math.max(0, currentBalance + amount);

    return {
      ...current,
      balance: newBalance,
      updatedAt: Date.now()
    };
  });

  if (!result.committed) {
    return { success: false, error: "Transaction échouée" };
  }

  const newBalance = result.snapshot.val()?.balance || 0;
  console.log("[WALLET] Ajustement admin:", { uid, amount, reason, adminId, newBalance });

  return { success: true, balance: newBalance };
}