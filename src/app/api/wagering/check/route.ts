/**
 * API Route: Vérification du statut wagering avant retrait
 * GET /api/wagering/check?userId=xxx
 * 
 * Cette API vérifie si un utilisateur peut effectuer un retrait
 * en fonction de sa progression de wagering.
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WageringCheckResponse {
  success: boolean;
  canWithdraw: boolean;
  message: string;
  wageringCompleted: number;
  wageringRequired: number;
  progress: number;
  remaining: number;
  withdrawalUnlocked: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json<WageringCheckResponse>(
        { 
          success: false, 
          canWithdraw: false, 
          message: "Paramètre userId manquant",
          wageringCompleted: 0,
          wageringRequired: 0,
          progress: 0,
          remaining: 0,
          withdrawalUnlocked: false
        },
        { status: 400 }
      );
    }

    console.log("[WAGERING CHECK] Vérification wagering:", { userId });

    // Récupérer les données utilisateur
    const userSnap = await adminDB.ref(`users/${userId}`).once("value");
    
    if (!userSnap.exists()) {
      console.error("[WAGERING CHECK] Utilisateur introuvable:", userId);
      return NextResponse.json<WageringCheckResponse>(
        { 
          success: false, 
          canWithdraw: false, 
          message: "Utilisateur introuvable",
          wageringCompleted: 0,
          wageringRequired: 0,
          progress: 0,
          remaining: 0,
          withdrawalUnlocked: false
        },
        { status: 404 }
      );
    }

    const user = userSnap.val();
    
    const totalDeposits = Number(user.totalDeposits || 0);
    const wageringCompleted = Number(user.wageringCompleted || 0);
    const wageringRequired = Number(user.wageringRequired || 0);
    const withdrawalUnlocked = Boolean(user.withdrawalUnlocked);

    // Si l'utilisateur n'a jamais déposé, il peut retirer (pas de wagering requis)
    if (totalDeposits === 0) {
      console.log("[WAGERING CHECK] Aucun dépôt, retrait autorisé:", { userId });
      return NextResponse.json<WageringCheckResponse>({
        success: true,
        canWithdraw: true,
        message: "Aucun dépôt effectué, retrait autorisé",
        wageringCompleted: 0,
        wageringRequired: 0,
        progress: 100,
        remaining: 0,
        withdrawalUnlocked: true
      });
    }

    // Recalculer wageringRequired pour s'assurer qu'il est à jour
    const calculatedWageringRequired = totalDeposits * 2;
    const progress = calculatedWageringRequired > 0 
      ? (wageringCompleted / calculatedWageringRequired) * 100 
      : 0;
    const remaining = Math.max(0, calculatedWageringRequired - wageringCompleted);
    const canWithdraw = wageringCompleted >= calculatedWageringRequired;

    console.log("[WAGERING CHECK] Statut wagering:", {
      userId,
      totalDeposits,
      wageringCompleted,
      wageringRequired: calculatedWageringRequired,
      progress: progress.toFixed(2) + "%",
      remaining,
      canWithdraw,
      withdrawalUnlocked
    });

    return NextResponse.json<WageringCheckResponse>({
      success: true,
      canWithdraw,
      message: canWithdraw 
        ? "Retrait autorisé" 
        : `Vous devez encore miser ${remaining} HTG avant de pouvoir retirer`,
      wageringCompleted,
      wageringRequired: calculatedWageringRequired,
      progress: Math.min(progress, 100),
      remaining,
      withdrawalUnlocked: canWithdraw
    });

  } catch (error) {
    console.error("[WAGERING CHECK] Erreur:", error);
    return NextResponse.json<WageringCheckResponse>(
      { 
        success: false, 
        canWithdraw: false, 
        message: "Erreur serveur",
        wageringCompleted: 0,
        wageringRequired: 0,
        progress: 0,
        remaining: 0,
        withdrawalUnlocked: false
      },
      { status: 500 }
    );
  }
}
