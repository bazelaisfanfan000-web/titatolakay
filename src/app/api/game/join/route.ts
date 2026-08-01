import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      "gameJoin",
      RATE_LIMIT_CONFIGS.gameJoin
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: "Trop de requêtes. Réessayez plus tard."
      }, {
        status: 429
      });
    }

    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: "Salle introuvable"
      }, {
        status: 400
      });
    }

    // AUTH
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "Utilisateur non connecté"
      }, {
        status: 401
      });
    }

    const token = authHeader?.replace("Bearer ", "") || "";

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Token vide"
      }, {
        status: 401
      });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // ROOM
    const roomRef = adminDB.ref(`rooms/${roomId}`);
    const snap = await roomRef.get();

    if (!snap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Cette partie n'existe pas"
      }, {
        status: 404
      });
    }

    const room = snap.val();

    if (room.status !== "waiting") {
      return NextResponse.json({
        success: false,
        error: "La partie a déjà commencé"
      }, {
        status: 400
      });
    }

    const players = room.players || {};

    if (players[uid]) {
      return NextResponse.json({
        success: false,
        error: "Vous êtes déjà dans cette partie"
      }, {
        status: 400
      });
    }

    if (room.creatorId === uid) {
      return NextResponse.json({
        success: false,
        error: "Vous êtes le créateur de cette partie"
      }, {
        status: 400
      });
    }

    const playersCount = Number(room.playersCount || 0);
    const maxPlayers = Number(room.maxPlayers || 2);

    if (playersCount >= maxPlayers) {
      return NextResponse.json({
        success: false,
        error: "Partie complète"
      }, {
        status: 400
      });
    }

    const bet = Number(room.bet || 0);
    const creatorId = room.creatorId;

    // PLAYER
    const currentPlayers = Object.keys(players).length;
    const symbol = currentPlayers === 0 ? "X" : "O";

    await adminDB.ref(`rooms/${roomId}/players/${uid}`).set({
      uid,
      name: decoded.name || decoded.email || "Joueur",
      symbol,
      ready: true,
      betPaid: true,
      joinedAt: Date.now()
    });

    const newPlayersCount = playersCount + 1;
    const newPot = Number(room.pot || 0) + bet;
    const roomFull = newPlayersCount >= maxPlayers;

    await roomRef.update({
      playersCount: newPlayersCount,
      pot: newPot,
      status: roomFull ? "starting" : "waiting",
      started: roomFull,
      startedAt: roomFull ? Date.now() : null,
      "game/status": roomFull ? "starting" : "waiting",
      "game/turn": "X",
      "game/turnStartedAt": Date.now()
    });

    return NextResponse.json({
      success: true,
      roomId,
      symbol,
      playersCount: newPlayersCount,
      pot: newPot,
      status: roomFull ? "starting" : "waiting"
    });

  } catch (error: any) {
    console.error("JOIN ERROR", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Erreur serveur"
    }, {
      status: 500
    });
  }
}
