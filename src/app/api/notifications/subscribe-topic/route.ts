import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminMessaging } from "@/lib/firebaseAdmin";

/**
 * API Route: Subscribe to Topic
 * POST /api/notifications/subscribe-topic
 * 
 * Abonne un token FCM à un topic Firebase
 * Utilisé pour recevoir des notifications broadcast (ex: nouvelles parties)
 */

interface SubscribeRequest {
  token: string;
  topic: string;
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequest = await request.json();
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

    console.log("[SUBSCRIBE_TOPIC] Abonnement au topic:", { topic, token: token.substring(0, 20) + "..." });

    // Abonner le token au topic via Firebase Admin
    const response = await adminMessaging.subscribeToTopic(token, topic);

    console.log("[SUBSCRIBE_TOPIC] Abonnement réussi:", {
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
    console.error("[SUBSCRIBE_TOPIC] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'abonnement au topic" },
      { status: 500 }
    );
  }
}
