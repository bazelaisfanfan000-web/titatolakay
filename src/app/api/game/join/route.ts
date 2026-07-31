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

    // Vérifier les soldes des deux joueurs AVANT de débiter
    const creatorBalanceSnap = await adminDB.ref(`users/${creatorId}/balance`).get();
    const creatorBalance = Number(creatorBalanceSnap.val() || 0);

    const joinerBalanceSnap = await adminDB.ref(`users/${uid}/balance`).get();
    const joinerBalance = Number(joinerBalanceSnap.val() || 0);

    if (creatorBalance < bet) {
      return NextResponse.json({
        success: false,
        error: "Le créateur n'a pas assez de solde"
      }, {
        status: 400
      });
    }

    if (joinerBalance < bet) {
      return NextResponse.json({
        success: false,
        error: "Solde insuffisant"
      }, {
        status: 400
      });
    }

    // DÉBIT ATOMIQUE DES DEUX JOUEURS
    let joinerOldBalance = 0;
    let joinerNewBalance = 0;

    // Le créateur est déjà débité lors de la création de la partie
    // On ne débite que le joueur qui rejoint
    const joinerBalanceRef = adminDB.ref(`users/${uid}/balance`);
    const joinerTransaction = await joinerBalanceRef.transaction((current: any) => {
      joinerOldBalance = Number(current || 0);

      if (joinerOldBalance < bet) {
        console.log("[JOIN_DEBIT_JOINER] Solde insuffisant:", joinerOldBalance, bet);
        return current;
      }

      joinerNewBalance = joinerOldBalance - bet;
      console.log("[JOIN_DEBIT_JOINER] Débit joueur:", joinerOldBalance, "->", joinerNewBalance);
      return joinerNewBalance;
    });

    console.log("[JOIN_DEBIT_JOINER] Résultat transaction:", {
      committed: joinerTransaction.committed,
      snapshot: joinerTransaction.snapshot?.val(),
      expected: joinerNewBalance
    });

    if (!joinerTransaction.committed) {
      return NextResponse.json({
        success: false,
        error: "Échec du débit du joueur - transaction non committed"
      }, {
        status: 500
      });
    }

    // Créer transaction pour le joueur qui rejoint
    await adminDB.ref(`transactions/${uid}`).push({
      type: "bet",
      reason: roomId,
      amount: -bet,
      oldBalance: joinerOldBalance,
      newBalance: joinerNewBalance,
      status: "completed",
      createdAt: Date.now()
    });

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
