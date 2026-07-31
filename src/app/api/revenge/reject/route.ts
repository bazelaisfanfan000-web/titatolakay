import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import { createAuditLog, AuditActions } from "@/lib/auditLogger";
import type { RevengeRequest } from "@/lib/revengeTypes";

/**
 * API Route: POST /api/revenge/reject
 * 
 * Refuse une demande de revanche
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      "revengeReject",
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
        error: "Vous n'êtes pas autorisé à refuser cette demande"
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

    // Mettre à jour la demande
    await adminDB.ref(`revengeRequests/${requestId}`).update({
      status: 'rejected',
      respondedAt: Date.now()
    });

    // Log d'audit
    await createAuditLog(
      userId,
      AuditActions.GAME_JOINED,
      {
        action: 'revenge_rejected',
        requestId,
        opponentId: revengeRequest.requesterId
      },
      "success"
    );

    return NextResponse.json({
      success: true,
      status: 'rejected'
    });

  } catch (error: any) {
    console.error("[REVENGE_REJECT_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Erreur serveur"
    }, {
      status: 500
    });
  }
}
