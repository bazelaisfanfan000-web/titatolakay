import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const prisma = getPrisma();
  try {
    const body = await request.json();
    const { stake, gameType = "titato" } = body;

    // Validation de la mise
    if (!stake || stake < 25) {
      return NextResponse.json(
        { success: false, error: "La mise minimum est de 25 HTG" },
        { status: 400 }
      );
    }

    if (stake > 5000) {
      return NextResponse.json(
        { success: false, error: "La mise maximum est de 5 000 HTG" },
        { status: 400 }
      );
    }

    // TODO: Récupérer l'utilisateur authentifié depuis le token JWT
    const userId = "user_id_placeholder";

    // Récupérer le solde de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier que le solde est suffisant
    if (user.balance < stake) {
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    // Calcul de la cagnotte et des commissions
    // Commission 10% sur la cagnotte totale (200 HTG) = 20 HTG
    // Gagnant reçoit : 200 - 20 = 180 HTG
    const totalPot = stake * 2;
    const rakeAmount = Math.round((totalPot * 0.10) * 100) / 100; // 10% de la cagnotte totale
    const winnerAmount = Math.round((totalPot - rakeAmount) * 100) / 100; // Cagnotte - commission

    // Initialiser la grille 10x10 vide
    const gridState = Array(10).fill(null).map(() => Array(10).fill(null));

    // Transaction atomique : déduire la mise et créer le match
    const result = await prisma.$transaction(async (tx) => {
      // Déduire la mise du solde
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: stake,
          },
        },
      });

      // Créer le match
      const match = await tx.match.create({
        data: {
          player1_id: userId,
          stake: stake,
          total_pot: totalPot,
          rake_amount: rakeAmount,
          winner_amount: winnerAmount,
          status: "WAITING",
          grid_state: gridState,
          current_turn: 1,
        },
      });

      return { user: updatedUser, match };
    });

    return NextResponse.json({
      success: true,
      matchId: result.match.id,
      stake: stake,
      totalPot: totalPot,
      rakeAmount: rakeAmount,
      winnerAmount: winnerAmount,
      newBalance: result.user.balance,
    });

  } catch (error) {
    console.error("[MATCH_CREATE_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
