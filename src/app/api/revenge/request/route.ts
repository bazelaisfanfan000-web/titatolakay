import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import { createAuditLog, AuditActions } from "@/lib/auditLogger";
import type { RevengeRequest, CreateRevengeRequest } from "@/lib/revengeTypes";

/**
 * API Route: POST /api/revenge/request
 * 
 * Crée une demande de revanche après une partie terminée
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      "revengeRequest",
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
    const { requesterId, opponentId, previousGameId, previousRoomId, betAmount } = body;

    // Validation des données
    if (!requesterId || !opponentId || !previousGameId || !previousRoomId || !betAmount) {
      return NextResponse.json({
        success: false,
        error: "Informations manquantes"
      }, {
        status: 400
      });
    }

    // Empêcher de demander une revanche à soi-même
    if (requesterId === opponentId) {
      return NextResponse.json({
        success: false,
        error: "Impossible de demander une revanche à soi-même"
      }, {
        status: 400
      });
    }

    // Vérifier que la mise est valide
    if (betAmount < 25 || betAmount > 10000) {
      return NextResponse.json({
        success: false,
        error: "Mise invalide"
      }, {
        status: 400
      });
    }

    // Vérifier que l'ancienne partie existe
    const previousRoomRef = adminDB.ref(`rooms/${previousRoomId}`);
    const previousRoomSnap = await previousRoomRef.get();

    if (!previousRoomSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Partie précédente introuvable"
      }, {
        status: 404
      });
    }

    const previousRoom = previousRoomSnap.val();

    // Vérifier que les deux joueurs étaient dans cette partie
    const players = previousRoom.players || {};
    if (!players[requesterId] || !players[opponentId]) {
      return NextResponse.json({
        success: false,
        error: "Les deux joueurs n'étaient pas dans cette partie"
      }, {
        status: 400
      });
    }

    // Vérifier qu'il n'y a pas déjà une demande de revanche en cours entre ces deux joueurs
    const existingRequestsRef = adminDB.ref('revengeRequests')
      .orderByChild('requesterId')
      .equalTo(requesterId);
    const existingRequestsSnap = await existingRequestsRef.once('value');

    if (existingRequestsSnap.exists()) {
      const requests = existingRequestsSnap.val();
      for (const requestId of Object.keys(requests)) {
        const req = requests[requestId];
        if (req.opponentId === opponentId && req.status === 'pending') {
          return NextResponse.json({
            success: false,
            error: "Une demande de revanche est déjà en cours"
          }, {
            status: 400
          });
        }
      }
    }

    // Créer la demande de revanche
    const requestId = `rev_${Date.now()}_${requesterId.slice(0, 8)}`;
    const revengeRequest: RevengeRequest = {
      requestId,
      requesterId,
      opponentId,
      previousGameId,
      previousRoomId,
      betAmount,
      status: 'pending',
      createdAt: Date.now()
    };

    await adminDB.ref(`revengeRequests/${requestId}`).set(revengeRequest);

    // Log d'audit
    await createAuditLog(
      requesterId,
      AuditActions.GAME_CREATED,
      {
        action: 'revenge_request',
        requestId,
        opponentId,
        previousGameId,
        betAmount
      },
      "success"
    );

    return NextResponse.json({
      success: true,
      requestId,
      status: 'pending'
    });

  } catch (error: any) {
    console.error("[REVENGE_REQUEST_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Erreur serveur"
    }, {
      status: 500
    });
  }
}
