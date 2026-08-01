import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {

  try {

    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "GameId manquant" },
        { status: 400 }
      );
    }

    // AUTH
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const decoded = await adminAuth.verifyIdToken(token);

    // LOAD ROOM
    const roomRef = adminDB.ref(`rooms/${gameId}`);
    const snap = await roomRef.get();

    if (!snap.exists()) {
      return NextResponse.json(
        { error: "Partie introuvable" },
        { status: 404 }
      );
    }

    const room = snap.val();

    // Vérifier que la partie est en attente de démarrage
    if (room.status !== "starting" && room.game?.status !== "starting") {
      return NextResponse.json(
        { error: "La partie n'est pas en phase de démarrage" },
        { status: 400 }
      );
    }

    // Vérifier que les mises n'ont pas déjà été débitées
    if (room.game?.betsDebited) {
      return NextResponse.json(
        { error: "Les mises ont déjà été débitées" },
        { status: 409 }
      );
    }

    const players = room.players || {};
    const playerIds = Object.keys(players);

    if (playerIds.length < 2) {
      return NextResponse.json(
        { error: "Il faut au moins 2 joueurs pour démarrer" },
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
      const newBalance = oldBalance - bet;

      updates[`users/${playerId}/balance`] = newBalance;

      // Créer transaction pour chaque joueur
      updates[`transactions/${playerId}/${Date.now()}_${playerId}`] = {
        type: "bet",
        gameId,
        amount: -bet,
        oldBalance,
        newBalance,
        status: "completed",
        createdAt: Date.now()
      };
    }

    // Marquer les mises comme débitées
    updates[`rooms/${gameId}/game/betsDebited`] = true;
    updates[`rooms/${gameId}/game/betsDebitedAt`] = Date.now();
    updates[`rooms/${gameId}/pot`] = bet * playerIds.length;

    // Exécuter la transaction atomique
    await adminDB.ref().update(updates);

    console.log("[START_BET] Mises débitées avec succès:", {
      gameId,
      playerIds,
      bet,
      totalPot: bet * playerIds.length
    });

    return NextResponse.json({
      success: true,
      debitedPlayers: playerIds.length,
      totalPot: bet * playerIds.length
    });

  } catch (error: any) {
    console.error("START_BET ERROR", error);

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
