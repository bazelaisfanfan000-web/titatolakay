/**
 * API Route: Récupérer le statut des parties jouées depuis le dernier dépôt
 * GET /api/user/games-status?userId=xxx
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Paramètre userId manquant" },
        { status: 400 }
      );
    }

    console.log("[GAMES_STATUS] Récupération statut parties:", { userId });

    const userSnap = await adminDB.ref(`users/${userId}`).once("value");
    
    if (!userSnap.exists()) {
      console.error("[GAMES_STATUS] Utilisateur introuvable:", userId);
      return NextResponse.json(
        { success: false, error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const userData = userSnap.val();
    const firstGamePlayed = userData.firstGamePlayed === true;
    const currentBalance = Number(userData.balance || 0);
    const canWithdraw = firstGamePlayed;
    const minimumBet = firstGamePlayed ? null : Math.round(currentBalance * 0.5);

    console.log("[GAMES_STATUS] Statut parties:", { 
      userId, 
      firstGamePlayed,
      firstGamePlayedRaw: userData.firstGamePlayed,
      canWithdraw,
      currentBalance,
      minimumBet
    });

    return NextResponse.json({
      success: true,
      firstGamePlayed,
      canWithdraw,
      currentBalance,
      minimumBet
    });

  } catch (error) {
    console.error("[GAMES_STATUS] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
