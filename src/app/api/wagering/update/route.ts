/**
 * API Route: Mise à jour du wagering (playthrough) lors d'une mise
 * POST /api/wagering/update
 * 
 * Cette API est appelée lorsqu'un joueur place une mise dans une partie.
 * Elle ajoute le montant de la mise à wageringCompleted de manière sécurisée.
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WageringUpdateRequest {
  userId: string;
  betAmount: number;
  gameId: string;
}

interface WageringUpdateResponse {
  success: boolean;
  message: string;
  wageringCompleted?: number;
  wageringRequired?: number;
  progress?: number;
  withdrawalUnlocked?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: WageringUpdateRequest = await request.json();
    const { userId, betAmount, gameId } = body;

    // Validation des entrées
    if (!userId || !betAmount || !gameId) {
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Paramètres manquants" },
        { status: 400 }
      );
    }

    if (typeof betAmount !== "number" || betAmount <= 0) {
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Montant de mise invalide" },
        { status: 400 }
      );
    }

    console.log("[WAGERING] Mise à jour wagering:", { userId, betAmount, gameId });

    // Vérifier que la partie existe et est valide
    const gameSnap = await adminDB.ref(`games/${gameId}`).once("value");
    if (!gameSnap.exists()) {
      console.error("[WAGERING] Partie non trouvée:", gameId);
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Partie non trouvée" },
        { status: 404 }
      );
    }

    const game = gameSnap.val();
    
    // Vérifier que l'utilisateur est bien dans cette partie
    const playerIds = Object.keys(game.players || {});
    if (!playerIds.includes(userId)) {
      console.error("[WAGERING] Utilisateur n'est pas dans cette partie:", { userId, gameId });
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Utilisateur n'est pas dans cette partie" },
        { status: 403 }
      );
    }

    // Vérifier que la mise n'a pas déjà été comptée pour cette partie
    const wageringKey = `wagering_tracking/${userId}/${gameId}`;
    const wageringTrackingSnap = await adminDB.ref(wageringKey).once("value");
    
    if (wageringTrackingSnap.exists()) {
      console.log("[WAGERING] Mise déjà comptée pour cette partie:", { userId, gameId });
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Mise déjà comptée pour cette partie" },
        { status: 409 }
      );
    }

    // Transaction atomique pour mettre à jour wageringCompleted
    const userRef = adminDB.ref(`users/${userId}`);
    const result = await userRef.transaction((current: Record<string, unknown> | null) => {
      if (!current) {
        console.error("[WAGERING] Utilisateur introuvable:", userId);
        return; // Annuler la transaction
      }

      const currentWageringCompleted = Number(current.wageringCompleted || 0);
      const currentTotalDeposits = Number(current.totalDeposits || 0);
      const currentWageringRequired = Number(current.wageringRequired || 0);

      const newWageringCompleted = currentWageringCompleted + betAmount;
      const newWageringRequired = currentTotalDeposits * 1.5;
      const withdrawalUnlocked = newWageringCompleted >= newWageringRequired;

      console.log("[WAGERING] Transaction:", {
        currentWageringCompleted,
        betAmount,
        newWageringCompleted,
        currentTotalDeposits,
        newWageringRequired,
        withdrawalUnlocked
      });

      return {
        ...current,
        wageringCompleted: newWageringCompleted,
        wageringRequired: newWageringRequired,
        withdrawalUnlocked,
        wageringUpdatedAt: Date.now(),
      };
    });

    if (!result.committed) {
      console.error("[WAGERING] Transaction Firebase échouée");
      return NextResponse.json<WageringUpdateResponse>(
        { success: false, message: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    const updatedUser = result.snapshot.val();
    const wageringCompleted = Number(updatedUser.wageringCompleted || 0);
    const wageringRequired = Number(updatedUser.wageringRequired || 0);
    const progress = wageringRequired > 0 ? (wageringCompleted / wageringRequired) * 100 : 0;
    const withdrawalUnlocked = Boolean(updatedUser.withdrawalUnlocked);

    // Marquer que cette mise a été comptée pour cette partie
    await adminDB.ref(wageringKey).set({
      userId,
      gameId,
      betAmount,
      processedAt: Date.now(),
    });

    console.log("[WAGERING] Mise à jour réussie:", {
      userId,
      wageringCompleted,
      wageringRequired,
      progress: progress.toFixed(2) + "%",
      withdrawalUnlocked
    });

    return NextResponse.json<WageringUpdateResponse>({
      success: true,
      message: "Wagering mis à jour avec succès",
      wageringCompleted,
      wageringRequired,
      progress: Math.min(progress, 100),
      withdrawalUnlocked,
    });

  } catch (error) {
    console.error("[WAGERING] Erreur:", error);
    return NextResponse.json<WageringUpdateResponse>(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
