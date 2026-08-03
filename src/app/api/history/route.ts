import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
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

    // Récupérer toutes les sources de données
    const [walletTransactions, rooms, deposits, withdrawals] = await Promise.all([
      adminDB.ref(`wallet_transactions/${uid}`).once("value"),
      adminDB.ref("rooms").orderByChild(`players/${uid}`).limitToLast(50).once("value"),
      adminDB.ref(`deposits/${uid}`).once("value"),
      adminDB.ref(`withdrawals/${uid}`).once("value")
    ]);

    const history: any[] = [];

    // 1. Traiter les transactions wallet
    if (walletTransactions.exists()) {
      const txs = walletTransactions.val();
      Object.entries(txs).forEach(([key, value]: [string, any]) => {
        history.push({
          id: key,
          type: value.type,
          amount: value.amount,
          status: value.status,
          description: value.description,
          referenceId: value.referenceId,
          createdAt: value.createdAt,
          completedAt: value.completedAt,
          failedAt: value.failedAt,
          failureReason: value.failureReason,
          metadata: value.metadata,
          source: "wallet_transaction"
        });
      });
    }

    // 2. Traiter les parties (rooms)
    if (rooms.exists()) {
      const roomsData = rooms.val();
      Object.entries(roomsData).forEach(([roomId, room]: [string, any]) => {
        // Vérifier si l'utilisateur a joué dans cette partie
        if (room.players && room.players[uid]) {
          const player = room.players[uid];
          const isWinner = room.game?.winner === player.symbol;
          const bet = Number(room.bet || 0);
          
          history.push({
            id: roomId,
            type: isWinner ? "game_win" : "game_loss",
            amount: isWinner ? bet : -bet,
            bet: bet,
            status: room.status === "finished" ? "completed" : room.status,
            description: isWinner ? "Partie gagnée" : "Partie perdue",
            createdAt: room.updatedAt || room.createdAt,
            metadata: {
              roomId,
              opponentId: Object.keys(room.players).find(id => id !== uid),
              winner: room.game?.winner,
              board: room.game?.board
            },
            source: "game"
          });
        }
      });
    }

    // 3. Traiter les dépôts
    if (deposits.exists()) {
      const depositsData = deposits.val();
      Object.entries(depositsData).forEach(([key, value]: [string, any]) => {
        history.push({
          id: key,
          type: "deposit",
          amount: value.amount,
          status: value.status,
          description: value.status === "completed" ? "Dépôt réussi" : value.status === "failed" ? "Dépôt échoué" : "Dépôt en cours",
          referenceId: value.referenceId,
          createdAt: value.createdAt,
          completedAt: value.completedAt,
          failedAt: value.failedAt,
          failureReason: value.failureReason,
          netAmount: value.netAmount,
          source: "deposit"
        });
      });
    }

    // 4. Traiter les retraits
    if (withdrawals.exists()) {
      const withdrawalsData = withdrawals.val();
      Object.entries(withdrawalsData).forEach(([key, value]: [string, any]) => {
        history.push({
          id: key,
          type: "withdraw",
          amount: -value.amount,
          status: value.status,
          description: value.status === "completed" ? "Retrait réussi" : value.status === "failed" ? "Retrait échoué" : "Retrait en cours",
          referenceId: value.referenceId,
          createdAt: value.createdAt,
          completedAt: value.completedAt,
          failedAt: value.failedAt,
          failureReason: value.failureReason,
          netAmount: value.netAmount,
          fee: value.fee,
          source: "withdrawal"
        });
      });
    }

    // Trier par date (plus récent en premier)
    history.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error("[HISTORY_API] Erreur:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la récupération de l'historique"
    }, { status: 500 });
  }
}
