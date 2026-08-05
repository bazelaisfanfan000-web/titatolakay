import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isValidMove, applyMove, checkGameStatus } from "@/lib/gameLogic";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, row, col, playerSymbol } = body;

    // Validation
    if (!matchId || row === undefined || col === undefined || !playerSymbol) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    if (playerSymbol !== 'X' && playerSymbol !== 'O') {
      return NextResponse.json(
        { success: false, error: "Symbole invalide (doit être 'X' ou 'O')" },
        { status: 400 }
      );
    }

    // TODO: Récupérer l'utilisateur authentifié depuis le token JWT
    const userId = "user_id_placeholder";

    // Récupérer le match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier que le match est en cours
    if (match.status !== "PLAYING") {
      return NextResponse.json(
        { success: false, error: "Ce match n'est pas en cours" },
        { status: 400 }
      );
    }

    // Vérifier que c'est le tour du joueur
    const isPlayer1 = match.player1_id === userId;
    const isPlayer2 = match.player2_id === userId;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json(
        { success: false, error: "Vous n'êtes pas dans ce match" },
        { status: 400 }
      );
    }

    const expectedSymbol = isPlayer1 ? 'X' : 'O';
    if (playerSymbol !== expectedSymbol) {
      return NextResponse.json(
        { success: false, error: "Ce n'est pas votre tour" },
        { status: 400 }
      );
    }

    // Récupérer la grille actuelle
    const gridState = match.grid_state as any[][];
    
    // Vérifier que le mouvement est valide
    if (!isValidMove(gridState, row, col, playerSymbol)) {
      return NextResponse.json(
        { success: false, error: "Mouvement invalide" },
        { status: 400 }
      );
    }

    // Appliquer le mouvement
    const newGridState = applyMove(gridState, row, col, playerSymbol);

    // Vérifier le statut du jeu
    const gameStatus = checkGameStatus(newGridState);

    // Transaction atomique : mettre à jour le match et répartir la cagnotte si terminé
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          grid_state: newGridState,
          current_turn: match.current_turn === 1 ? 2 : 1,
          status: gameStatus.finished ? "FINISHED" : "PLAYING",
          finished_at: gameStatus.finished ? new Date() : null,
        },
      });

      // Si le match est terminé avec un gagnant, répartir la cagnotte
      if (gameStatus.finished && gameStatus.winner && !gameStatus.isDraw) {
        const winnerId = gameStatus.winner === 'X' ? match.player1_id : match.player2_id;
        const loserId = gameStatus.winner === 'X' ? match.player2_id : match.player1_id;

        if (!winnerId || !loserId) {
          throw new Error("Winner or loser ID is null");
        }

        // Calcul : commission 10% sur la cagnotte totale
        // Cagnotte = stake * 2, Gagnant reçoit = Cagnotte - 10%
        const totalPot = match.stake * 2;
        const rakeAmount = Math.round((totalPot * 0.10) * 100) / 100; // 10% de la cagnotte totale
        const winnerAmount = Math.round((totalPot - rakeAmount) * 100) / 100; // Cagnotte - commission

        // Créditer le gagnant
        await tx.user.update({
          where: { id: winnerId },
          data: {
            balance: {
              increment: winnerAmount,
            },
          },
        });

        // Enregistrer la transaction du gagnant
        await tx.transaction.create({
          data: {
            user_id: winnerId,
            type: "MATCH_WIN",
            amount_gross: totalPot,
            fee: rakeAmount,
            amount_net: winnerAmount,
            status: "SUCCESS",
            description: `Gain du match ${matchId} (commission 10% : ${rakeAmount} HTG)`,
          },
        });

        // Enregistrer la transaction du perdant
        await tx.transaction.create({
          data: {
            user_id: loserId,
            type: "MATCH_LOSS",
            amount_gross: match.stake,
            fee: 0,
            amount_net: match.stake,
            status: "SUCCESS",
            description: `Perte du match ${matchId}`,
          },
        });

        // Système de parrainage : 10% de la perte pour le parrain
        const loser = await tx.user.findUnique({
          where: { id: loserId },
          select: { referrer_id: true },
        });

        if (loser && loser.referrer_id) {
          const referralBonus = Math.round((match.stake * 0.10) * 100) / 100; // 10% de la perte

          await tx.user.update({
            where: { id: loser.referrer_id },
            data: {
              balance: {
                increment: referralBonus,
              },
            },
          });

          await tx.transaction.create({
            data: {
              user_id: loser.referrer_id,
              type: "REFERRAL_BONUS",
              amount_gross: referralBonus,
              fee: 0,
              amount_net: referralBonus,
              status: "SUCCESS",
              description: `Bonus parrainage (10% perte de ${loserId} dans match ${matchId})`,
            },
          });
        }

        // Mettre à jour le match avec le gagnant
        updatedMatch.winner_id = winnerId;
      }

      // Si match nul, réinitialiser la grille du même match (pas de nouvelle mise)
      if (gameStatus.finished && gameStatus.isDraw) {
        // Réinitialiser la grille et continuer le match
        updatedMatch.grid_state = Array(10).fill(null).map(() => Array(10).fill(""));
        updatedMatch.current_turn = 1;
        updatedMatch.status = "PLAYING";
        updatedMatch.finished_at = null;
        // Ne pas créer de nouveau match, juste réinitialiser
      }

      return { match: updatedMatch };
    });

    return NextResponse.json({
      success: true,
      matchId: result.match.id,
      gridState: result.match.grid_state,
      currentTurn: result.match.current_turn,
      status: result.match.status,
      winner: gameStatus.winner,
      isDraw: gameStatus.isDraw,
      finished: gameStatus.finished,
      isDrawReset: gameStatus.isDraw, // Indicateur pour le frontend : match nul et grille réinitialisée
    });

  } catch (error) {
    console.error("[MATCH_MOVE_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
