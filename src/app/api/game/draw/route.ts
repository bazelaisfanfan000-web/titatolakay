import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

/*
====================================================
GESTION DU MATCH NUL - RÉINITIALISATION PLATEAU
====================================================
*/

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "GameId manquant" },
        { status: 400 }
      );
    }

    // Authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = decoded.uid;

    // Charger la partie
    const roomRef = adminDB.ref(`rooms/${gameId}`);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists()) {
      return NextResponse.json(
        { error: "Partie introuvable" },
        { status: 404 }
      );
    }

    const room = roomSnap.val();

    // Vérifier que l'appelant est un joueur de la partie
    if (!room.players[callerUid]) {
      return NextResponse.json(
        { error: "Vous n'êtes pas dans cette partie" },
        { status: 403 }
      );
    }

    // Vérifier que la partie est en cours
    if (room.status !== "playing") {
      return NextResponse.json(
        { error: "La partie n'est pas en cours" },
        { status: 400 }
      );
    }

    // Vérifier que le plateau est rempli et qu'il n'y a pas de gagnant
    const board = room.game?.board || {};
    const winner = room.game?.winner;
    const boardFilled = Object.keys(board).length >= 25; // 5x5 = 25 cases

    if (!boardFilled) {
      return NextResponse.json(
        { error: "Le plateau n'est pas rempli" },
        { status: 400 }
      );
    }

    if (winner) {
      return NextResponse.json(
        { error: "Il y a déjà un gagnant" },
        { status: 400 }
      );
    }

    // Réinitialiser uniquement le plateau et le timer
    await roomRef.update({
      "game/board": {},
      "game/moves": 0,
      "game/turn": "X",
      "game/turnStartedAt": Date.now(),
      "game/round": (room.game?.round || 0) + 1,
      updatedAt: Date.now(),
    });

    console.log(`[DRAW_RESET] Room ${gameId} - Plateau réinitialisé pour nouveau round`);

    return NextResponse.json({
      success: true,
      message: "Partie nulle ! Nouvelle manche commencée.",
      round: (room.game?.round || 0) + 1,
    });

  } catch (error: any) {
    console.error("[DRAW_ERROR]", error);
    return NextResponse.json(
      {
        error: error?.message || "Erreur serveur"
      },
      {
        status: 500
      }
    );
  }
}
