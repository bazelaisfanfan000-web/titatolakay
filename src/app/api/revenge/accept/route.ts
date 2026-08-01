import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import { createAuditLog, AuditActions } from "@/lib/auditLogger";
import type { RevengeRequest } from "@/lib/revengeTypes";
import { validateBet } from "@/lib/validation";

/**
 * API Route: POST /api/revenge/accept
 * 
 * Accepte une demande de revanche et crée une nouvelle partie
 * Toutes les validations sont faites côté serveur
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      "revengeAccept",
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
    const { requestId, userId } = body;

    // Validation des données
    if (!requestId || !userId) {
      return NextResponse.json({
        success: false,
        error: "Informations manquantes"
      }, {
        status: 400
      });
    }

    // Récupérer la demande de revanche
    const requestRef = adminDB.ref(`revengeRequests/${requestId}`);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Demande de revanche introuvable"
      }, {
        status: 404
      });
    }

    const revengeRequest: RevengeRequest = requestSnap.val();

    // Vérifier que l'utilisateur est l'opposant
    if (revengeRequest.opponentId !== userId) {
      return NextResponse.json({
        success: false,
        error: "Vous n'êtes pas autorisé à accepter cette demande"
      }, {
        status: 403
      });
    }

    // Vérifier que la demande est en attente
    if (revengeRequest.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: "Cette demande n'est plus en attente"
      }, {
        status: 400
      });
    }

    // Vérifier que les deux utilisateurs existent
    const requesterUserRef = adminDB.ref(`users/${revengeRequest.requesterId}`);
    const opponentUserRef = adminDB.ref(`users/${revengeRequest.opponentId}`);

    const [requesterSnap, opponentSnap] = await Promise.all([
      requesterUserRef.get(),
      opponentUserRef.get()
    ]);

    if (!requesterSnap.exists() || !opponentSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Un des utilisateurs n'existe pas"
      }, {
        status: 404
      });
    }

    const requesterUser = requesterSnap.val();
    const opponentUser = opponentSnap.val();

    /*
    ================================================
    VALIDATION MISE STRICTE
    ================================================
    */

    const betValidation = validateBet(revengeRequest.betAmount);

    if (!betValidation.valid) {
      return NextResponse.json({
        success: false,
        error: "Mise de la revanche invalide"
      }, {
        status: 400
      });
    }

    const validatedBet = betValidation.value!;

    // Vérifier que les deux joueurs ont un solde suffisant
    const requesterBalance = Number(requesterUser.balance || 0);
    const opponentBalance = Number(opponentUser.balance || 0);
    const betAmount = validatedBet;

    if (requesterBalance < betAmount) {
      return NextResponse.json({
        success: false,
        error: "Solde insuffisant pour l'adversaire"
      }, {
        status: 400
      });
    }

    if (opponentBalance < betAmount) {
      return NextResponse.json({
        success: false,
        error: "Solde insuffisant"
      }, {
        status: 400
      });
    }

    // Vérifier que les deux joueurs ne sont pas déjà dans une partie active
    const requesterActiveGameRef = adminDB.ref('rooms')
      .orderByChild(`players/${revengeRequest.requesterId}`)
      .limitToLast(1);
    const opponentActiveGameRef = adminDB.ref('rooms')
      .orderByChild(`players/${revengeRequest.opponentId}`)
      .limitToLast(1);

    const [requesterActiveSnap, opponentActiveSnap] = await Promise.all([
      requesterActiveGameRef.once('value'),
      opponentActiveGameRef.once('value')
    ]);

    const checkActiveGame = (snap: any, uid: string) => {
      if (snap.exists()) {
        const rooms = snap.val();
        for (const roomId of Object.keys(rooms)) {
          const room = rooms[roomId];
          if (room.status === 'playing' || room.status === 'starting') {
            return true;
          }
        }
      }
      return false;
    };

    if (checkActiveGame(requesterActiveSnap, revengeRequest.requesterId)) {
      return NextResponse.json({
        success: false,
        error: "L'adversaire est déjà dans une partie active"
      }, {
        status: 400
      });
    }

    if (checkActiveGame(opponentActiveSnap, revengeRequest.opponentId)) {
      return NextResponse.json({
        success: false,
        error: "Vous êtes déjà dans une partie active"
      }, {
        status: 400
      });
    }

    // Verrou pour éviter double acceptation
    const lockRef = adminDB.ref(`revengeRequests/${requestId}/lock`);
    const lockSnap = await lockRef.get();

    if (lockSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Cette demande est déjà en cours de traitement"
      }, {
        status: 400
      });
    }

    await lockRef.set({ locked: true, lockedAt: Date.now() });

    try {
      // Débiter les deux joueurs atomiquement
      const requesterBalanceRef = adminDB.ref(`users/${revengeRequest.requesterId}/balance`);
      const opponentBalanceRef = adminDB.ref(`users/${revengeRequest.opponentId}/balance`);

      let requesterDebitSuccess = false;
      let opponentDebitSuccess = false;
      let requesterOldBalance = 0;
      let opponentOldBalance = 0;
      let requesterNewBalance = 0;
      let opponentNewBalance = 0;

      await Promise.all([
        requesterBalanceRef.transaction((current: any) => {
          requesterOldBalance = Number(current || 0);
          if (requesterOldBalance < betAmount) {
            return current;
          }
          requesterNewBalance = requesterOldBalance - betAmount;
          requesterDebitSuccess = true;
          return requesterNewBalance;
        }),
        opponentBalanceRef.transaction((current: any) => {
          opponentOldBalance = Number(current || 0);
          if (opponentOldBalance < betAmount) {
            return current;
          }
          opponentNewBalance = opponentOldBalance - betAmount;
          opponentDebitSuccess = true;
          return opponentNewBalance;
        })
      ]);

      if (!requesterDebitSuccess || !opponentDebitSuccess) {
        await lockRef.remove();
        return NextResponse.json({
          success: false,
          error: "Solde insuffisant lors du débit"
        }, {
          status: 400
        });
      }

      // Créer les transactions
      const transactionRef = adminDB.ref(`transactions`);
      const [requesterTx, opponentTx] = await Promise.all([
        transactionRef.push({
          uid: revengeRequest.requesterId,
          type: 'bet',
          reason: 'revenge',
          amount: -betAmount,
          oldBalance: requesterOldBalance,
          newBalance: requesterNewBalance,
          status: 'completed',
          createdAt: Date.now()
        }),
        transactionRef.push({
          uid: revengeRequest.opponentId,
          type: 'bet',
          reason: 'revenge',
          amount: -betAmount,
          oldBalance: opponentOldBalance,
          newBalance: opponentNewBalance,
          status: 'completed',
          createdAt: Date.now()
        })
      ]);

      // Créer la nouvelle partie
      const newRoomId = `room_${Date.now()}_${revengeRequest.requesterId.slice(0, 4)}`;
      const newGameId = `game_${Date.now()}`;

      const newRoom = {
        roomId: newRoomId,
        gameId: newGameId,
        creatorId: revengeRequest.requesterId,
        bet: betAmount,
        pot: betAmount * 2,
        status: 'waiting',
        playersCount: 0,
        maxPlayers: 2,
        players: {},
        createdAt: Date.now(),
        game: {
          status: 'waiting',
          turn: 'X',
          turnStartedAt: Date.now(),
          board: {}
        },
        metadata: {
          isRevenge: true,
          previousRoomId: revengeRequest.previousRoomId,
          previousGameId: revengeRequest.previousGameId,
          revengeRequestId: requestId
        }
      };

      await adminDB.ref(`rooms/${newRoomId}`).set(newRoom);

      // Ajouter les joueurs
      const [requesterPlayer, opponentPlayer] = await Promise.all([
        adminDB.ref(`rooms/${newRoomId}/players/${revengeRequest.requesterId}`).set({
          uid: revengeRequest.requesterId,
          name: requesterUser.name || requesterUser.email || 'Joueur',
          symbol: 'X',
          ready: true,
          betPaid: true,
          joinedAt: Date.now()
        }),
        adminDB.ref(`rooms/${newRoomId}/players/${revengeRequest.opponentId}`).set({
          uid: revengeRequest.opponentId,
          name: opponentUser.name || opponentUser.email || 'Joueur',
          symbol: 'O',
          ready: true,
          betPaid: true,
          joinedAt: Date.now()
        })
      ]);

      // Mettre à jour la room
      await adminDB.ref(`rooms/${newRoomId}`).update({
        playersCount: 2,
        status: 'starting',
        started: true,
        startedAt: Date.now(),
        'game/status': 'starting',
        'game/turn': 'X',
        'game/turnStartedAt': Date.now()
      });

      // Mettre à jour la demande de revanche
      await adminDB.ref(`revengeRequests/${requestId}`).update({
        status: 'accepted',
        respondedAt: Date.now(),
        newRoomId
      });

      // Supprimer le verrou
      await lockRef.remove();

      // Logs d'audit
      await Promise.all([
        createAuditLog(
          revengeRequest.requesterId,
          AuditActions.GAME_JOINED,
          {
            action: 'revenge_accepted',
            requestId,
            newRoomId,
            newGameId,
            betAmount
          },
          "success"
        ),
        createAuditLog(
          revengeRequest.opponentId,
          AuditActions.GAME_JOINED,
          {
            action: 'revenge_accepted',
            requestId,
            newRoomId,
            newGameId,
            betAmount
          },
          "success"
        )
      ]);

      return NextResponse.json({
        success: true,
        newRoomId,
        newGameId,
        requestId
      });

    } catch (transactionError) {
      // En cas d'erreur, supprimer le verrou
      await lockRef.remove();
      throw transactionError;
    }

  } catch (error: any) {
    console.error("[REVENGE_ACCEPT_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Erreur serveur"
    }, {
      status: 500
    });
  }
}
