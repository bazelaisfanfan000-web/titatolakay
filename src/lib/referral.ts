/**
 * Système de Parrainage - WinCash
 * Gestion des codes de parrainage et des commissions
 */

import { adminDB } from "./firebaseAdmin";
import { creditWallet } from "./wallet";
import { createLedgerEntry } from "./ledger";

// ✅ TAUX DE COMMISSION PASSÉ DE 10% À 5%
const REFERRAL_COMMISSION_RATE = 0.05; // 5%
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
  console.log("[REFERRAL] hasActiveReferrer appelé pour:", userId);
  
  const snapshot = await adminDB.ref(`users/${userId}`).once("value");
  
  if (!snapshot.exists()) {
    console.log("[REFERRAL] Utilisateur introuvable:", userId);
    return { hasReferrer: false };
  }
  
  const userData = snapshot.val();
  console.log("[REFERRAL] Données utilisateur:", { 
    userId, 
    referredBy: userData.referredBy, 
    referralEndDate: userData.referralEndDate 
  });
  
  if (!userData.referredBy) {
    console.log("[REFERRAL] Pas de referredBy pour:", userId);
    return { hasReferrer: false };
  }
  
  // Vérifier si la période de parrainage est encore active
  const now = Date.now();
  const referralEndDate = userData.referralEndDate || 0;
  
  console.log("[REFERRAL] Vérification période:", { now, referralEndDate, isActive: now <= referralEndDate });
  
  if (now > referralEndDate) {
    console.log("[REFERRAL] Période expirée pour:", userId);
    return { hasReferrer: false };
  }
  
  console.log("[REFERRAL] Parrain actif trouvé:", { userId, referrerId: userData.referredBy });
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
    
    console.log("[REFERRAL] ==================== DÉBUT TRAITEMENT COMMISSION ====================");
    console.log("[REFERRAL] Paramètres reçus:", { gameId, loserId, lostAmount });
    console.log("[REFERRAL] Taux de commission configuré:", REFERRAL_COMMISSION_RATE);
    console.log("[REFERRAL] Calcul attendu:", `${lostAmount} × ${REFERRAL_COMMISSION_RATE} = ${lostAmount * REFERRAL_COMMISSION_RATE}`);
    
    // Vérifier si le perdant a un parrain actif
    const { hasReferrer, referrerId } = await hasActiveReferrer(loserId);
    
    console.log("[REFERRAL] Vérification parrain:", { hasReferrer, referrerId });
    
    if (!hasReferrer || !referrerId) {
      console.log("[REFERRAL] Pas de parrain actif pour:", loserId);
      return { success: true, commission: 0 }; // Pas de commission si pas de parrain
    }
    
    // Vérifier si une commission a déjà été versée pour cette partie
    const existingReward = await adminDB
      .ref(`referralRewards`)
      .orderByChild("gameId")
      .equalTo(gameId)
      .once("value");
    
    if (existingReward.exists()) {
      console.log("[REFERRAL] Commission déjà versée pour:", gameId);
      return { success: true, commission: 0 }; // Déjà traité
    }
    
    // Calculer la commission (5% de la perte)
    const commission = Math.round((lostAmount * REFERRAL_COMMISSION_RATE) * 100) / 100;
    
    console.log("[REFERRAL] Détails calcul commission:", { 
      lostAmount, 
      rate: REFERRAL_COMMISSION_RATE, 
      calculation: `${lostAmount} * ${REFERRAL_COMMISSION_RATE} = ${lostAmount * REFERRAL_COMMISSION_RATE}`,
      commission: commission,
      expectedCommission: lostAmount * 0.05  // ✅ mis à jour pour cohérence
    });
    
    if (commission <= 0) {
      console.log("[REFERRAL] Commission nulle ou négative");
      return { success: true, commission: 0 };
    }
    
    // Créditer le wallet du parrain
    console.log("[REFERRAL] Crédit wallet pour:", referrerId, "montant:", commission);
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
    
    console.log("[REFERRAL] Wallet crédité avec succès:", creditResult);
    
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
    
    console.log("[REFERRAL] Commission versée avec succès:", {
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

/**
 * Calcule le nombre de filleuls d'un utilisateur (comptage dynamique)
 * Compte tous les utilisateurs dont referredBy == userId
 */
export async function getReferralCount(userId: string): Promise<number> {
  try {
    const snapshot = await adminDB
      .ref("users")
      .orderByChild("referredBy")
      .equalTo(userId)
      .once("value");
    
    if (!snapshot.exists()) {
      return 0;
    }
    
    let count = 0;
    snapshot.forEach(() => {
      count++;
    });
    
    return count;
  } catch (error) {
    console.error("[REFERRAL] Erreur comptage filleuls:", error);
    return 0;
  }
}

/**
 * Récupère la liste complète des filleuls d'un utilisateur avec leurs statistiques
 */
export async function getReferrals(userId: string): Promise<any[]> {
  try {
    const snapshot = await adminDB
      .ref("users")
      .orderByChild("referredBy")
      .equalTo(userId)
      .once("value");
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const referrals: any[] = [];
    const now = Date.now();
    
    snapshot.forEach((child: any) => {
      const userData = child.val();
      const referralEndDate = userData.referralEndDate || 0;
      const isActive = now <= referralEndDate;
      
      referrals.push({
        uid: child.key,
        username: userData.username || "Utilisateur",
        email: userData.email,
        createdAt: userData.createdAt,
        referralStartDate: userData.referralStartDate,
        referralEndDate: referralEndDate,
        isActive: isActive,
        timeRemaining: isActive ? referralEndDate - now : 0
      });
    });
    
    // Trier par date d'inscription décroissante
    referrals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    return referrals;
  } catch (error) {
    console.error("[REFERRAL] Erreur récupération filleuls:", error);
    return [];
  }
}

/**
 * Récupère les statistiques détaillées de parrainage
 */
export async function getDetailedReferralStats(userId: string): Promise<{
  totalReferrals: number;
  activeReferrals: number;
  expiredReferrals: number;
  totalEarnings: number;
  todayEarnings: number;
  monthEarnings: number;
}> {
  try {
    console.log("[REFERRAL] getDetailedReferralStats appelé pour:", userId);
    
    // Compter les filleuls
    const totalReferrals = await getReferralCount(userId);
    console.log("[REFERRAL] totalReferrals:", totalReferrals);
    
    // Récupérer les filleuls pour compter actifs/expirés
    const referrals = await getReferrals(userId);
    const activeReferrals = referrals.filter(r => r.isActive).length;
    const expiredReferrals = referrals.filter(r => !r.isActive).length;
    console.log("[REFERRAL] activeReferrals:", activeReferrals, "expiredReferrals:", expiredReferrals);
    
    // Calculer les gains
    const rewardsSnapshot = await adminDB
      .ref("referralRewards")
      .orderByChild("referrerId")
      .equalTo(userId)
      .once("value");
    
    console.log("[REFERRAL] rewardsSnapshot exists:", rewardsSnapshot.exists());
    
    let totalEarnings = 0;
    let todayEarnings = 0;
    let monthEarnings = 0;
    
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    if (rewardsSnapshot.exists()) {
      rewardsSnapshot.forEach((child: any) => {
        const reward = child.val();
        const amount = reward.commissionAmount || 0;
        const createdAt = reward.createdAt || 0;
        
        console.log("[REFERRAL] Reward trouvé:", { amount, createdAt, gameId: reward.gameId });
        
        totalEarnings += amount;
        
        if (createdAt >= todayStart.getTime()) {
          todayEarnings += amount;
        }
        
        if (createdAt >= monthStart.getTime()) {
          monthEarnings += amount;
        }
      });
    }
    
    console.log("[REFERRAL] Stats calculées:", { totalEarnings, todayEarnings, monthEarnings });
    
    return {
      totalReferrals,
      activeReferrals,
      expiredReferrals,
      totalEarnings,
      todayEarnings,
      monthEarnings
    };
  } catch (error) {
    console.error("[REFERRAL] Erreur stats détaillées:", error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      expiredReferrals: 0,
      totalEarnings: 0,
      todayEarnings: 0,
      monthEarnings: 0
    };
  }
}