import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId } = body;

    // Validation
    if (!matchId) {
      return NextResponse.json(
        { success: false, error: "ID du match requis" },
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

    // Vérifier que le match est en attente
    if (match.status !== "WAITING") {
      return NextResponse.json(
        { success: false, error: "Ce match n'est plus disponible" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur n'est pas le créateur
    if (match.player1_id === userId) {
      return NextResponse.json(
        { success: false, error: "Vous ne pouvez pas rejoindre votre propre match" },
        { status: 400 }
      );
    }

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
    if (user.balance < match.stake) {
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    // Transaction atomique : déduire la mise et rejoindre le match
    const result = await prisma.$transaction(async (tx) => {
      // Déduire la mise du solde
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: match.stake,
          },
        },
      });

      // Mettre à jour le match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          player2_id: userId,
          status: "PLAYING",
        },
      });

      return { user: updatedUser, match: updatedMatch };
    });

    return NextResponse.json({
      success: true,
      matchId: result.match.id,
      stake: result.match.stake,
      newBalance: result.user.balance,
    });

  } catch (error) {
    console.error("[MATCH_JOIN_API] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
