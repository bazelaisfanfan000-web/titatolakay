import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import { validateBet } from "@/lib/validation";

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

    /*
    ================================================
    VALIDATION MISE STRICTE (vérification de cohérence)
    ================================================
    */

    const betValidation = validateBet(room.bet);

    if (!betValidation.valid) {

      return NextResponse.json({
        success: false,
        error: "Mise de la partie invalide"
      }, {
        status: 400
      });

    }

    /*
    ================================================
    VÉRIFIER SOLDE DU JOUEUR QUI REJOINT
    ================================================
    */

    const balanceSnap =
      await adminDB
        .ref(`users/${uid}/balance`)
        .once("value");

    const balance =
      Number(balanceSnap.val() || 0);

    if (balance < bet) {

      return NextResponse.json({
        success: false,
        error: "Solde insuffisant pour rejoindre cette partie"
      }, {
        status: 400
      });

    }

    console.log(
      "JOIN ROOM: Balance vérifiée:",
      { uid, balance, bet }
    );

    /*
    ================================================
    VÉRIFIER MISE MINIMUM (50% du solde) SI PREMIÈRE PARTIE
    ================================================
    */

    const userSnap = await adminDB.ref(`users/${uid}`).once("value");
    const userData = userSnap.val();
    const firstGamePlayed = userData.firstGamePlayed === true;

    console.log("[JOIN ROOM] Vérification mise minimum:", {
      uid,
      balance,
      bet,
      firstGamePlayed,
      firstGamePlayedRaw: userData.firstGamePlayed
    });

    // Si le joueur n'a pas encore joué sa première partie après le dépôt
    if (!firstGamePlayed) {
      const minimumBet = Math.round(balance * 0.5);
      
      if (bet < minimumBet) {
        console.log("[JOIN ROOM] Mise insuffisante (doit être >= 50% du solde):", {
          uid,
          bet,
          minimumBet,
          balance,
          firstGamePlayed
        });
        
        return NextResponse.json({
          success: false,
          error: `La mise minimum est de ${minimumBet} HTG (50% de votre solde de ${balance} HTG) !`
        }, {
          status: 400
        });
      }
    }

    // PLAYER
    const currentPlayers = Object.keys(players).length;
    const symbol = currentPlayers === 0 ? "X" : "O";

    await adminDB.ref(`rooms/${roomId}/players/${uid}`).set({
      uid,
      name: decoded.name || decoded.email || "Joueur",
      symbol,
      ready: true,
      joinedAt: Date.now()
    });

    const newPlayersCount = playersCount + 1;
    const roomFull = newPlayersCount >= maxPlayers;

    await roomRef.update({
      playersCount: newPlayersCount,
      status: roomFull ? "ready" : "waiting"
    });

    return NextResponse.json({
      success: true,
      roomId,
      symbol,
      playersCount: newPlayersCount,
      status: roomFull ? "ready" : "waiting"
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
