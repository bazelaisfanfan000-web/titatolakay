/**
 * Système de Parrainage - WinCash
 * Gestion des codes de parrainage et des commissions
 */

import { adminDB } from "./firebaseAdmin";
import { creditWallet } from "./wallet";
import { createLedgerEntry } from "./ledger";

const REFERRAL_COMMISSION_RATE = 0.10; // 10%
const REFERRAL_DURATION_MONTHS = 6;

/**
 * Génère un code de parrainage unique et difficile à deviner
 * Format: 8 caractères alphanumériques (lettres majuscules + chiffres)
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclut I, 1, O, 0 pour éviter confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Vérifie si un code de parrainage existe déjà
 */
export async function referralCodeExists(code: string): Promise<boolean> {
  const snapshot = await adminDB
    .ref("users")
    .orderByChild("referralCode")
    .equalTo(code)
    .once("value");
  
  return snapshot.exists();
}

/**
 * Génère un code de parrainage unique pour un utilisateur
 * Réessaie si le code existe déjà
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (await referralCodeExists(code) && attempts < maxAttempts) {
    code = generateReferralCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error("Impossible de générer un code de parrainage unique");
  }
  
  return code;
}

/**
 * Crée ou met à jour le code de parrainage d'un utilisateur
 */
export async function createReferralCode(userId: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const userRef = adminDB.ref(`users/${userId}`);
    const snapshot = await userRef.once("value");
    
    if (!snapshot.exists()) {
      return { success: false, error: "Utilisateur introuvable" };
    }
    
    const userData = snapshot.val();
    
    // Si l'utilisateur a déjà un code, le retourner
    if (userData.referralCode) {
      return { success: true, code: userData.referralCode };
    }
    
    // Générer un nouveau code
    const code = await generateUniqueReferralCode();
    
    await userRef.update({
      referralCode: code,
      referralCreatedAt: Date.now()
    });
    
    console.log("[REFERRAL] Code créé:", { userId, code });
    
    return { success: true, code };
  } catch (error) {
    console.error("[REFERRAL] Erreur création code:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Récupère l'UID du parrain à partir d'un code
 */
export async function getReferrerByCode(code: string): Promise<string | null> {
  const snapshot = await adminDB
    .ref("users")
    .orderByChild("referralCode")
    .equalTo(code)
    .once("value");
  
  if (!snapshot.exists()) {
    return null;
  }
  
  let referrerId: string | null = null;
  snapshot.forEach((child: any) => {
    referrerId = child.key;
  });
  
  return referrerId;
}

/**
 * Enregistre un utilisateur comme filleul d'un parrain
 */
export async function recordReferral(
  referredUserId: string,
  referrerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Empêcher l'auto-parrainage
    if (referredUserId === referrerId) {
      return { success: false, error: "Auto-parrainage non autorisé" };
    }
    
    const userRef = adminDB.ref(`users/${referredUserId}`);
    const snapshot = await userRef.once("value");
    
    if (!snapshot.exists()) {
      return { success: false, error: "Utilisateur introuvable" };
    }
    
    const userData = snapshot.val();
    
    // Vérifier si l'utilisateur a déjà un parrain
    if (userData.referredBy) {
      return { success: false, error: "Utilisateur a déjà un parrain" };
    }
    
    // Calculer la date de fin de période de parrainage (6 mois)
    const referralEndDate = Date.now() + (REFERRAL_DURATION_MONTHS * 30 * 24 * 60 * 60 * 1000);
    
    await userRef.update({
      referredBy: referrerId,
      referralStartDate: Date.now(),
      referralEndDate: referralEndDate
    });
    
    // Incrémenter le compteur de filleuls du parrain
    await adminDB.ref(`users/${referrerId}/referralCount`).transaction((current: any) => {
      return (current || 0) + 1;
    });
    
    console.log("[REFERRAL] Parrainage enregistré:", { referredUserId, referrerId });
    
    return { success: true };
  } catch (error) {
    console.error("[REFERRAL] Erreur enregistrement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Vérifie si un utilisateur a un parrain actif (période de 6 mois non expirée)
 */
export async function hasActiveReferrer(userId: string): Promise<{ hasReferrer: boolean; referrerId?: string }> {
  const snapshot = await adminDB.ref(`users/${userId}`).once("value");
  
  if (!snapshot.exists()) {
    return { hasReferrer: false };
  }
  
  const userData = snapshot.val();
  
  if (!userData.referredBy) {
    return { hasReferrer: false };
  }
  
  // Vérifier si la période de parrainage est encore active
  const now = Date.now();
  const referralEndDate = userData.referralEndDate || 0;
  
  if (now > referralEndDate) {
    return { hasReferrer: false };
  }
  
  return { hasReferrer: true, referrerId: userData.referredBy };
}

/**
 * Calcule et verse la commission de parrainage
 * Appelé après chaque partie terminée où le filleul a perdu
 */
export async function processReferralCommission(params: {
  gameId: string;
  loserId: string;
  lostAmount: number;
}): Promise<{ success: boolean; commission?: number; error?: string }> {
  try {
    const { gameId, loserId, lostAmount } = params;
    
    // Vérifier si le perdant a un parrain actif
    const { hasReferrer, referrerId } = await hasActiveReferrer(loserId);
    
    if (!hasReferrer || !referrerId) {
      return { success: true, commission: 0 }; // Pas de commission si pas de parrain
    }
    
    // Vérifier si une commission a déjà été versée pour cette partie
    const existingReward = await adminDB
      .ref(`referralRewards`)
      .orderByChild("gameId")
      .equalTo(gameId)
      .once("value");
    
    if (existingReward.exists()) {
      return { success: true, commission: 0 }; // Déjà traité
    }
    
    // Calculer la commission (10% de la perte)
    const commission = Math.round((lostAmount * REFERRAL_COMMISSION_RATE) * 100) / 100;
    
    if (commission <= 0) {
      return { success: true, commission: 0 };
    }
    
    // Créditer le wallet du parrain
    const creditResult = await creditWallet(
      referrerId,
      commission,
      gameId,
      `Commission parrainage - ${gameId}`
    );
    
    if (!creditResult.success) {
      console.error("[REFERRAL] Erreur crédit wallet:", creditResult.error);
      return { success: false, error: "Erreur crédit wallet" };
    }
    
    // Créer l'entrée ledger
    await createLedgerEntry({
      userId: referrerId,
      type: "referral_commission",
      amount: commission,
      balanceBefore: creditResult.balance! - commission,
      balanceAfter: creditResult.balance!,
      referenceId: gameId,
      status: "completed",
      source: "referral",
      description: `Commission parrainage - ${gameId}`,
      metadata: { gameId, referredUserId: loserId, lostAmount }
    });
    
    // Enregistrer la récompense de parrainage
    const rewardRef = adminDB.ref(`referralRewards`).push();
    await rewardRef.set({
      id: rewardRef.key,
      referrerId,
      referredUserId: loserId,
      gameId,
      lostAmount,
      commissionAmount: commission,
      createdAt: Date.now()
    });
    
    console.log("[REFERRAL] Commission versée:", {
      referrerId,
      referredUserId: loserId,
      gameId,
      commission
    });
    
    return { success: true, commission };
  } catch (error) {
    console.error("[REFERRAL] Erreur traitement commission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

/**
 * Récupère les statistiques de parrainage d'un utilisateur
 */
export async function getReferralStats(userId: string): Promise<{
  referralCount: number;
  totalEarnings: number;
  recentRewards: any[];
}> {
  try {
    const userSnapshot = await adminDB.ref(`users/${userId}`).once("value");
    const referralCount = userSnapshot.val()?.referralCount || 0;
    
    // Récupérer les récompenses de parrainage
    const rewardsSnapshot = await adminDB
      .ref(`referralRewards`)
      .orderByChild("referrerId")
      .equalTo(userId)
      .once("value");
    
    let totalEarnings = 0;
    const recentRewards: any[] = [];
    
    if (rewardsSnapshot.exists()) {
      rewardsSnapshot.forEach((child: any) => {
        const reward = child.val();
        totalEarnings += reward.commissionAmount;
        recentRewards.push(reward);
      });
    }
    
    // Trier par date décroissante et limiter à 10
    recentRewards.sort((a, b) => b.createdAt - a.createdAt);
    recentRewards.splice(10);
    
    return {
      referralCount,
      totalEarnings,
      recentRewards
    };
  } catch (error) {
    console.error("[REFERRAL] Erreur stats:", error);
    return {
      referralCount: 0,
      totalEarnings: 0,
      recentRewards: []
    };
  }
}

/**
 * Récupère l'historique complet des récompenses de parrainage
 */
export async function getReferralRewards(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const snapshot = await adminDB
      .ref(`referralRewards`)
      .orderByChild("referrerId")
      .equalTo(userId)
      .limitToLast(limit)
      .once("value");
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const rewards: any[] = [];
    snapshot.forEach((child: any) => {
      rewards.push(child.val());
    });
    
    return rewards.reverse();
  } catch (error) {
    console.error("[REFERRAL] Erreur historique:", error);
    return [];
  }
}

/**
 * Récupère les informations de parrainage d'un utilisateur
 */
export async function getReferralInfo(userId: string): Promise<{
  referralCode?: string;
  referredBy?: string;
  referralStartDate?: number;
  referralEndDate?: number;
}> {
  try {
    const snapshot = await adminDB.ref(`users/${userId}`).once("value");
    
    if (!snapshot.exists()) {
      return {};
    }
    
    const userData = snapshot.val();
    
    return {
      referralCode: userData.referralCode,
      referredBy: userData.referredBy,
      referralStartDate: userData.referralStartDate,
      referralEndDate: userData.referralEndDate
    };
  } catch (error) {
    console.error("[REFERRAL] Erreur info:", error);
    return {};
  }
}
