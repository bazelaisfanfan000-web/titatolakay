import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { sendPushNotification } from "@/lib/broadcastNotification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({
        success: false,
        error: "Game ID requis"
      }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        error: "Non authentifié"
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Récupérer la partie
    const roomRef = adminDB.ref(`rooms/${gameId}`);
    const roomSnap = await roomRef.once("value");

    if (!roomSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Partie introuvable"
      }, { status: 404 });
    }

    const room = roomSnap.val();

    console.log("[QUIT_GAME] Statut de la partie:", room.status);

    // Vérifier que l'utilisateur est un joueur de la partie
    if (!room.players || !room.players[uid]) {
      return NextResponse.json({
        success: false,
        error: "Vous n'êtes pas un joueur de cette partie"
      }, { status: 403 });
    }

    // Vérifier que la partie n'est pas déjà terminée
    if (room.status === "finished") {
      return NextResponse.json({
        success: false,
        error: "La partie est déjà terminée"
      }, { status: 400 });
    }

    // Trouver l'adversaire
    const opponentId = Object.keys(room.players).find(id => id !== uid);
    if (!opponentId) {
      return NextResponse.json({
        success: false,
        error: "Adversaire introuvable"
      }, { status: 400 });
    }

    const opponent = room.players[opponentId];
    const quitter = room.players[uid];
    const bet = Number(room.bet || 0);

    console.log("[QUIT_GAME] Détails:", { opponentId, opponent, quitter, bet });

    // Marquer la partie comme terminée par abandon
    // NE PAS CRÉDITER DIRECTEMENT - laisser finish-payment gérer le paiement
    const updates: any = {
      [`rooms/${gameId}/status`]: "finished",
      [`rooms/${gameId}/game/status`]: "finished",
      [`rooms/${gameId}/game/winner`]: opponent.symbol,
      [`rooms/${gameId}/game/quitBy`]: uid,
      [`rooms/${gameId}/game/quitAt`]: Date.now(),
      [`rooms/${gameId}/updatedAt`]: Date.now()
    };

    // Exécuter les mises à jour
    await adminDB.ref().update(updates);

    // Envoyer notification à l'adversaire
    await sendPushNotification(
      opponentId,
      "🏆 Victoire !",
      `${quitter.name || "Votre adversaire"} a quitté la partie. Vous avez gagné !`,
      {
        type: "game_win",
        gameId,
        link: "/dashboard"
      }
    );

    console.log("[QUIT_GAME] Partie abandonnée:", {
      gameId,
      quitterId: uid,
      quitterName: quitter.name,
      winnerId: opponentId,
      winnerName: opponent.name,
      bet
    });

    return NextResponse.json({
      success: true,
      message: "Partie quittée avec succès"
    });

  } catch (error) {
    console.error("[QUIT_GAME] Erreur:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'abandon de la partie"
    }, { status: 500 });
  }
}
