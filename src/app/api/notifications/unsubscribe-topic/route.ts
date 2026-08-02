import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminMessaging } from "@/lib/firebaseAdmin";

/**
 * API Route: Unsubscribe from Topic
 * POST /api/notifications/unsubscribe-topic
 * 
 * Désabonne un token FCM d'un topic Firebase
 */

interface UnsubscribeRequest {
  token: string;
  topic: string;
}

export async function POST(request: Request) {
  try {
    const body: UnsubscribeRequest = await request.json();
    const { token, topic } = body;

    // Validation
    if (!token || !topic) {
      return NextResponse.json(
        { success: false, error: "Token et topic requis" },
        { status: 400 }
      );
    }

    // Valider le topic (sécurité)
    const allowedTopics = ["new-games", "all-users", "game-updates"];
    if (!allowedTopics.includes(topic)) {
      return NextResponse.json(
        { success: false, error: "Topic non autorisé" },
        { status: 400 }
      );
    }

    console.log("[UNSUBSCRIBE_TOPIC] Désabonnement du topic:", { topic, token: token.substring(0, 20) + "..." });

    // Désabonner le token du topic via Firebase Admin
    const response = await adminMessaging.unsubscribeFromTopic(token, topic);

    console.log("[UNSUBSCRIBE_TOPIC] Désabonnement réussi:", {
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return NextResponse.json({
      success: true,
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

  } catch (error) {
    console.error("[UNSUBSCRIBE_TOPIC] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors du désabonnement du topic" },
      { status: 500 }
    );
  }
}
