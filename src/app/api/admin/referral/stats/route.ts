import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Récupérer tous les utilisateurs
    const usersSnapshot = await adminDB.ref("users").once("value");
    const users: any[] = [];
    
    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((child: any) => {
        const userData = child.val();
        users.push({
          uid: child.key,
          ...userData
        });
      });
    }

    // Récupérer toutes les commissions
    const rewardsSnapshot = await adminDB.ref("referralRewards").once("value");
    const rewards: any[] = [];
    
    if (rewardsSnapshot.exists()) {
      rewardsSnapshot.forEach((child: any) => {
        rewards.push(child.val());
      });
    }

    // Calculer les stats
    const referrers = users.filter(u => u.referralCode);
    const referrals = users.filter(u => u.referredBy);
    const now = Date.now();
    const activeReferrals = referrals.filter(u => (u.referralEndDate || 0) > now);
    const totalCommissions = rewards.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalReferrers: referrers.length,
        totalReferrals: referrals.length,
        totalCommissions,
        activeReferrals: activeReferrals.length
      },
      users: users.slice(0, 100), // Limiter à 100 utilisateurs
      rewards: rewards.slice(0, 100) // Limiter à 100 commissions
    });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_STATS] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
