import { NextResponse } from "next/server";
import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { sendPushNotification } from "@/lib/broadcastNotification";
import { addMonthlyPoints } from "@/lib/monthlyChampion";
import { validateBet } from "@/lib/validation";
import { processReferralCommission, hasActiveReferrer } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "GameId manquant" },
        { status: 400 }
      );
    }

    // ==========================
    // AUTH
    // ==========================

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

    // ==========================
    // LOAD ROOM
    // ==========================

    const roomRef = adminDB.ref(`rooms/${gameId}`);
    const snap = await roomRef.get();

    if (!snap.exists()) {
      return NextResponse.json(
        { error: "Partie introuvable" },
        { status: 404 }
      );
    }

    const room = snap.val();

    if (room.game?.status !== "finished") {
      return NextResponse.json(
        { error: "Partie non terminée" },
        { status: 400 }
      );
    }

    // ==========================
    // SECURITY
    // ==========================

    if (!room.players?.[callerUid]) {
      return NextResponse.json(
        { error: "Vous ne participez pas à cette partie" },
        { status: 403 }
      );
    }

    // ==========================
    // LOCK PAYMENT
    // ==========================

    const paymentRef = adminDB.ref(`rooms/${gameId}/game/paymentStatus`);
    const lock = await paymentRef.transaction((current) => {
      if (current === "processing" || current === "completed") {
        return;
      }
      return "processing";
    });

    if (!lock.committed) {
      console.log("[FINISH_PAYMENT] Paiement déjà traité, retour 409");
      return NextResponse.json(
        { error: "Paiement déjà traité" },
        { status: 409 }
      );
    }

    // ==========================
    // VALIDATE WINNER (AMÉLIORÉ)
    // ==========================

    const winnerValue = room.game.winner;

    if (!winnerValue) {
      await paymentRef.set(null);
      return NextResponse.json(
        { error: "Aucun gagnant" },
        { status: 400 }
      );
    }

    let winnerUid: string | null = null;

    // 1. Si winnerValue est un UID (présent dans players)
    if (room.players[winnerValue]) {
      winnerUid = winnerValue;
    } else {
      // 2. Sinon, chercher le joueur dont le symbole correspond
      const entry = Object.entries(room.players).find(
        ([, player]: any) => player.symbol === winnerValue
      );
      if (entry) {
        winnerUid = entry[0];
      }
    }

    if (!winnerUid) {
      console.error("[FINISH_PAYMENT] Gagnant invalide:", {
        winnerValue,
        players: room.players,
      });
      await paymentRef.set(null);
      return NextResponse.json(
        { error: "Gagnant invalide" },
        { status: 400 }
      );
    }

    console.log("[FINISH_PAYMENT] ✅ Gagnant validé:", {
      gameId,
      winnerValue,
      winnerUid,
      playerIds: Object.keys(room.players),
    });

    // ==========================
    // CALCUL DU GAIN (NOUVEAU SYSTÈME)
    // ==========================

    const betValidation = validateBet(room.bet);

    if (!betValidation.valid) {
      console.error("[FINISH_PAYMENT] Mise invalide:", room.bet);
      await paymentRef.set(null);
      return NextResponse.json(
        { error: "Mise de la partie invalide" },
        { status: 400 }
      );
    }

    const bet = betValidation.value!;

    // Commission = 50% de la mise du perdant
    // Crédit gagnant = sa mise + (50% de la mise du perdant)
    const commission = Math.round((bet * 0.5) * 100) / 100;
    const winnerCredit = Math.round((bet + commission) * 100) / 100;

    console.log("[NEW_PAYMENT_SYSTEM] Calcul du gain:", {
      bet,
      commission,
      winnerCredit,
      formula: `${bet} + (${bet} * 0.5) = ${winnerCredit}`,
    });

    if (winnerCredit <= 0) {
      await paymentRef.set(null);
      return NextResponse.json(
        { error: "Gain invalide" },
        { status: 400 }
      );
    }

    // ==========================
    // TRANSACTION ATOMIQUE FINALE
    // ==========================

    const playerIds = Object.keys(room.players);
    const loserId = playerIds.find((id) => id !== winnerUid) || null;

    const updates: any = {};

    // ============================================================
    // ⚠️ DÉDUCTION DU PERDANT SUPPRIMÉE
    // La mise du perdant est déjà déduite lors de la création/rejointe.
    // On ne fait que créditer le gagnant et mettre à jour les stats.
    // ============================================================

    // Mise à jour des stats du perdant (sans toucher à son solde)
    if (loserId) {
      await adminDB.ref(`users/${loserId}`).transaction((user: any) => {
        if (!user) return user;
        user.losses = Number(user.losses || 0) + 1;
        user.gamesPlayed = Number(user.gamesPlayed || 0) + 1;
        user.winRate = Math.round(
          (Number(user.wins || 0) / user.gamesPlayed) * 100
        );
        return user;
      });
    }

    // Créditer le gagnant
    const winnerBalanceRef = adminDB.ref(`users/${winnerUid}/balance`);
    const balanceSnap = await winnerBalanceRef.get();
    const oldBalance = Number(balanceSnap.val() || 0);
    const newBalance = Math.round((oldBalance + winnerCredit) * 100) / 100;

    updates[`users/${winnerUid}/balance`] = newBalance;
    updates[`users/${winnerUid}/updatedAt`] = Date.now();

    const transactionId = `${Date.now()}_${winnerUid}`;
    updates[`wallet_transactions/${winnerUid}/${transactionId}`] = {
      id: transactionId,
      userId: winnerUid,
      type: "game_win",
      amount: winnerCredit,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      referenceId: gameId,
      status: "completed",
      source: "game",
      description: `Gain de jeu - ${gameId}`,
      metadata: { gameId, bet, commission },
      createdAt: Date.now(),
      completedAt: Date.now(),
    };

    updates[`rooms/${gameId}/game/paymentStatus`] = "completed";
    updates[`rooms/${gameId}/game/winnerUid`] = winnerUid;
    updates[`rooms/${gameId}/game/reward`] = winnerCredit;
    updates[`rooms/${gameId}/game/commission`] = commission;
    updates[`rooms/${gameId}/game/paidAt`] = Date.now();
    updates[`rooms/${gameId}/game/rewardProcessed`] = true;

    await adminDB.ref().update(updates);

    // ==========================
    // COMMISSION DE PARRAINAGE
    // ==========================

    try {
      if (loserId) {
        const lostAmount = Number(room.bet) || bet;
        const commissionResult = await processReferralCommission({
          gameId,
          loserId,
          lostAmount,
        });

        if (commissionResult.success && commissionResult.commission && commissionResult.commission > 0) {
          console.log("[FINISH_PAYMENT] Commission parrainage versée:", {
            gameId,
            loserId,
            commission: commissionResult.commission,
          });

          try {
            const { hasReferrer, referrerId } = await hasActiveReferrer(loserId);
            if (hasReferrer && referrerId) {
              await sendPushNotification(
                referrerId,
                "🎉 Commission reçue !",
                `Vous avez reçu +${commissionResult.commission} HTG grâce au parrainage`,
                {
                  type: "referral_commission",
                  amount: commissionResult.commission,
                  gameId,
                  referredUserId: loserId,
                }
              );
            }
          } catch (notifError) {
            console.error("[FINISH_PAYMENT] Erreur notification parrainage:", notifError);
          }
        } else if (!commissionResult.success) {
          console.error("[FINISH_PAYMENT] Erreur commission:", commissionResult.error);
        }
      }
    } catch (commissionError) {
      console.error("[FINISH_PAYMENT] Erreur commission parrainage:", commissionError);
      // Ne pas bloquer le paiement si la commission échoue
    }

    // ==========================
    // STATS GAGNANT
    // ==========================

    await adminDB.ref(`users/${winnerUid}`).transaction((user: any) => {
      if (!user) return user;
      user.wins = Number(user.wins || 0) + 1;
      user.gamesPlayed = Number(user.gamesPlayed || 0) + 1;
      user.winRate = Math.round(
        (Number(user.wins || 0) / user.gamesPlayed) * 100
      );
      return user;
    });

    await addMonthlyPoints(winnerUid, 10);

    await sendPushNotification(
      winnerUid,
      "🏆 Victoire !",
      `Tu as gagné ${winnerCredit} HTG`,
      {
        type: "win",
        amount: winnerCredit,
      }
    );

    return NextResponse.json({
      success: true,
      winnerUid,
      reward: winnerCredit,
      commission,
      oldBalance,
      newBalance,
    });
  } catch (error: any) {
    console.error("FINISH PAYMENT ERROR", error);
    return NextResponse.json(
      {
        error: error.message || "Erreur serveur",
      },
      { status: 500 }
    );
  }
}