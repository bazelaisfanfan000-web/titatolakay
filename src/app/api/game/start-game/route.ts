import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: "RoomId manquant" },
        { status: 400 }
      );
    }

    // AUTH
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // LOAD ROOM
    const roomRef = adminDB.ref(`rooms/${roomId}`);
    const snap = await roomRef.get();

    if (!snap.exists()) {
      return NextResponse.json(
        { error: "Partie introuvable" },
        { status: 404 }
      );
    }

    const room = snap.val();

    // Vérifier que la partie est en attente (ready)
    if (room.status !== "ready") {
      return NextResponse.json(
        { error: "La partie n'est pas prête à démarrer" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est le créateur
    if (room.creatorId !== uid) {
      return NextResponse.json(
        { error: "Seul le créateur peut démarrer la partie" },
        { status: 403 }
      );
    }

    // Vérifier que le jeu n'a pas déjà commencé (anti-double démarrage)
    if (room.game?.betsDebited || room.status === "countdown" || room.status === "playing") {
      return NextResponse.json(
        { error: "La partie a déjà commencé" },
        { status: 409 }
      );
    }

    const players = room.players || {};
    const playerIds = Object.keys(players);

    // Vérifier qu'il y a exactement 2 joueurs
    if (playerIds.length !== 2) {
      return NextResponse.json(
        { error: "Il faut exactement 2 joueurs pour démarrer" },
        { status: 400 }
      );
    }

    const bet = Number(room.bet || 0);

    if (bet <= 0) {
      return NextResponse.json(
        { error: "Mise invalide" },
        { status: 400 }
      );
    }

    // Vérifier le solde de tous les joueurs
    const playerBalances: Record<string, number> = {};

    for (const playerId of playerIds) {
      const balanceSnap = await adminDB.ref(`users/${playerId}/balance`).get();
      const balance = Number(balanceSnap.val() || 0);

      if (balance < bet) {
        return NextResponse.json(
          { error: "Solde insuffisant pour un des joueurs" },
          { status: 400 }
        );
      }

      playerBalances[playerId] = balance;
    }

    // TRANSACTION ATOMIQUE: Débiter tous les joueurs
    const updates: any = {};

    for (const playerId of playerIds) {
      const oldBalance = playerBalances[playerId];
      const newBalance = Math.round((oldBalance - bet) * 100) / 100; // Précision 2 décimales

      updates[`users/${playerId}/balance`] = newBalance;
      updates[`users/${playerId}/updatedAt`] = Date.now();

      // Créer transaction pour chaque joueur
      const transactionId = `${Date.now()}_${playerId}`;
      updates[`wallet_transactions/${playerId}/${transactionId}`] = {
        id: transactionId,
        userId: playerId,
        type: "game_bet",
        amount: -bet,
        balanceBefore: oldBalance,
        balanceAfter: newBalance,
        referenceId: roomId,
        status: "completed",
        source: "game",
        description: `Mise de jeu - ${roomId}`,
        metadata: { roomId, bet },
        createdAt: Date.now(),
        completedAt: Date.now()
      };
    }

    // Marquer les mises comme débitées et passer à countdown
    updates[`rooms/${roomId}/game/betsDebited`] = true;
    updates[`rooms/${roomId}/game/betsDebitedAt`] = Date.now();
    updates[`rooms/${roomId}/pot`] = bet * playerIds.length;
    updates[`rooms/${roomId}/status`] = "countdown";
    updates[`rooms/${roomId}/updatedAt`] = Date.now();
    updates[`rooms/${roomId}/countdownAt`] = Date.now(); // Pour le compte à rebours

    // Initialiser l'état du jeu
    updates[`rooms/${roomId}/game/status`] = "countdown";
    updates[`rooms/${roomId}/game/turn`] = "X";
    updates[`rooms/${roomId}/game/turnStartedAt`] = Date.now();

    // Exécuter la transaction atomique
    await adminDB.ref().update(updates);

    console.log("[START_GAME] Partie démarrée avec succès:", {
      roomId,
      playerIds,
      bet,
      totalPot: bet * playerIds.length,
      status: "countdown"
    });

    return NextResponse.json({
      success: true,
      roomId,
      status: "countdown",
      pot: bet * playerIds.length,
      playersCount: playerIds.length
    });

  } catch (error: any) {
    console.error("START_GAME ERROR", error);

    return NextResponse.json(
      {
        error: error.message || "Erreur serveur"
      },
      {
        status: 500
      }
    );
  }
}
