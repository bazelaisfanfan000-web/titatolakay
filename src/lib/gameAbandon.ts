import { adminDB } from "@/lib/firebaseAdmin";

/*
====================================================
GESTION DES PARTIES ABANDONNÉES
====================================================
*/

const ABANDON_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WAITING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes pour parties en attente

export interface AbandonedGame {
  roomId: string;
  status: string;
  players: Record<string, any>;
  bet: number;
  pot: number;
  createdAt: number;
  updatedAt: number;
}

/*
====================================================
DÉTECTER LES PARTIES ABANDONNÉES
====================================================
*/
export async function detectAbandonedGames() {
  const roomsRef = adminDB.ref("rooms");
  const snapshot = await roomsRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const rooms = snapshot.val();
  const now = Date.now();
  const abandonedGames: AbandonedGame[] = [];

  for (const [roomId, roomData] of Object.entries(rooms)) {
    const room = roomData as any;
    const updatedAt = room.updatedAt || room.createdAt;
    const timeSinceUpdate = now - updatedAt;

    // Partie en attente depuis trop longtemps
    if (room.status === "waiting" && timeSinceUpdate > WAITING_TIMEOUT_MS) {
      abandonedGames.push({
        roomId,
        status: "waiting",
        players: room.players || {},
        bet: room.bet || 0,
        pot: room.pot || 0,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      });
    }

    // Partie commencée mais inactive
    if (room.status === "playing" && timeSinceUpdate > ABANDON_TIMEOUT_MS) {
      abandonedGames.push({
        roomId,
        status: "playing",
        players: room.players || {},
        bet: room.bet || 0,
        pot: room.pot || 0,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      });
    }
  }

  return abandonedGames;
}

/*
====================================================
REMBOURSER LES JOUEURS D'UNE PARTIE
====================================================
*/
// DÉSACTIVÉ: Avec le nouveau système PlayToWin, aucun remboursement automatique
// Les mises restent bloquées même si la partie est abandonnée
// Seul le gagnant reçoit un crédit à la fin de la partie
/*
export async function refundGamePlayers(
  roomId: string,
  players: Record<string, any>,
  bet: number
): Promise<boolean> {
  const refundPromises = Object.entries(players).map(async ([uid, player]) => {
    if (!player.betPaid) return;

    const userRef = adminDB.ref(`users/${uid}`);
    
    const result = await userRef.transaction((current: any) => {
      if (!current) return;
      
      const currentBalance = Number(current.balance || 0);
      return {
        ...current,
        balance: currentBalance + bet,
        balanceUpdatedAt: Date.now(),
      };
    });

    if (!result.committed) {
      console.error(`[ABANDON_REFUND_FAILED] User ${uid}`);
      return;
    }

    // Enregistrer la transaction de remboursement
    await adminDB.ref(`transactions/${uid}`).push({
      type: "refund",
      reason: "abandoned_game",
      gameId: roomId,
      amount: bet,
      status: "completed",
      createdAt: Date.now(),
    });
  });

  await Promise.allSettled(refundPromises);
  return true;
}
*/

/*
====================================================
MARQUER UNE PARTIE COMME ABANDONNÉE
====================================================
*/
export async function markGameAsAbandoned(roomId: string): Promise<boolean> {
  const roomRef = adminDB.ref(`rooms/${roomId}`);
  
  await roomRef.update({
    status: "abandoned",
    abandonedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return true;
}

/*
====================================================
NETTOYER LES PARTIES ABANDONNÉES
====================================================
*/
export async function cleanupAbandonedGames(): Promise<{
  processed: number;
  refunded: number;
  errors: number;
}> {
  const abandonedGames = await detectAbandonedGames();
  
  let processed = 0;
  let refunded = 0;
  let errors = 0;

  for (const game of abandonedGames) {
    try {
      processed++;

      // DÉSACTIVÉ: Plus de remboursement automatique avec le nouveau système PlayToWin
      // await refundGamePlayers(game.roomId, game.players, game.bet);
      // refunded++;

      // Marquer comme abandonnée
      await markGameAsAbandoned(game.roomId);

      console.log(`[ABANDON_CLEANUP] Room ${game.roomId} processed`);
    } catch (error) {
      console.error(`[ABANDON_ERROR] Room ${game.roomId}:`, error);
      errors++;
    }
  }

  return { processed, refunded, errors };
}

/*
====================================================
VÉRIFIER SI UNE PARTIE EST ABANDONNÉE
====================================================
*/
export async function isGameAbandoned(roomId: string): Promise<boolean> {
  const roomRef = adminDB.ref(`rooms/${roomId}`);
  const snapshot = await roomRef.get();

  if (!snapshot.exists()) {
    return false;
  }

  const room = snapshot.val();
  return room.status === "abandoned";
}
