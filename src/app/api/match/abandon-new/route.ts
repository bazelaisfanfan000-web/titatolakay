import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const prisma = getPrisma();
  try {
    const body = await request.json();
    const { matchId } = body;

    // Validation
    if (!matchId) {
      return NextResponse.json(
        { success: false, error: "Paramètre matchId manquant" },
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

    // Vérifier que l'utilisateur est dans le match
    const isPlayer1 = match.player1_id === userId;
    const isPlayer2 = match.player2_id === userId;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json(
        { success: false, error: "Vous n'êtes pas dans ce match" },
        { status: 400 }
      );
    }

    // L'autre joueur gagne
    const winnerId = isPlayer1 ? match.player2_id : match.player1_id;
    const loserId = isPlayer1 ? match.player1_id : match.player2_id;

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { success: false, error: "L'autre joueur n'est pas encore rejoint" },
        { status: 400 }
      );
    }

    // Transaction atomique : terminer le match et répartir la cagnotte
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mettre à jour le match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: "FINISHED",
          winner_id: winnerId,
          finished_at: new Date(),
        },
      });

      // Calcul : commission 10% sur la cagnotte totale
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
          description: `Gain du match ${matchId} (abandon, commission 10% : ${rakeAmount} HTG)`,
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
          description: `Perte par abandon du match ${matchId}`,
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
            description: `Bonus parrainage (10% perte par abandon de ${loserId} dans match ${matchId})`,
          },
        });
      }

      return { match: updatedMatch };
    });

    return NextResponse.json({
      success: true,
      matchId: result.match.id,
      winnerId: result.match.winner_id,
      status: result.match.status,
      finished: true,
      abandoned: true,
    });

  } catch (error) {
    console.error("[MATCH_ABANDON_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
