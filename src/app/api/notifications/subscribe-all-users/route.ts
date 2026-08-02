import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDB, adminMessaging } from "@/lib/firebaseAdmin";

/**
 * API Route: Subscribe All Users to Topic
 * POST /api/notifications/subscribe-all-users
 * 
 * Abonne tous les utilisateurs existants au topic spécifié
 * Utile pour migrer les utilisateurs existants vers un nouveau topic
 */

interface SubscribeAllRequest {
  topic: string;
  adminKey?: string; // Clé admin pour sécuriser l'endpoint
}

export async function POST(request: Request) {
  try {
    const body: SubscribeAllRequest = await request.json();
    const { topic, adminKey } = body;

    // Validation admin key (sécurité)
    const expectedAdminKey = process.env.ADMIN_NOTIFICATION_KEY;
    if (expectedAdminKey && adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Validation topic
    const allowedTopics = ["new-games", "all-users", "game-updates"];
    if (!topic || !allowedTopics.includes(topic)) {
      return NextResponse.json(
        { success: false, error: "Topic non autorisé" },
        { status: 400 }
      );
    }

    console.log("[SUBSCRIBE_ALL] Début abonnement de tous les utilisateurs au topic:", topic);

    // Récupérer tous les utilisateurs
    const usersSnapshot = await adminDB.ref("users").once("value");

    if (!usersSnapshot.exists()) {
      return NextResponse.json({
        success: true,
        message: "Aucun utilisateur trouvé",
        subscribed: 0,
        failed: 0,
      });
    }

    const users = usersSnapshot.val();
    const userIds = Object.keys(users);

    console.log(`[SUBSCRIBE_ALL] ${userIds.length} utilisateurs trouvés`);

    let totalSubscribed = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // Pour chaque utilisateur, récupérer ses tokens FCM et les abonner
    for (const userId of userIds) {
      try {
        const fcmTokensRef = adminDB.ref(`users/${userId}/fcmTokens`);
        const tokensSnapshot = await fcmTokensRef.once("value");

        if (!tokensSnapshot.exists()) {
          console.log(`[SUBSCRIBE_ALL] Aucun token pour l'utilisateur ${userId}`);
          continue;
        }

        const tokens = tokensSnapshot.val();
        const userTokens: string[] = [];

        for (const tokenKey in tokens) {
          const tokenData = tokens[tokenKey];
          if (tokenData.token) {
            userTokens.push(tokenData.token);
          }
        }

        if (userTokens.length === 0) {
          console.log(`[SUBSCRIBE_ALL] Aucun token valide pour l'utilisateur ${userId}`);
          continue;
        }

        console.log(`[SUBSCRIBE_ALL] ${userTokens.length} tokens pour l'utilisateur ${userId}`);

        // Abonner tous les tokens de cet utilisateur au topic
        // Firebase permet jusqu'à 1000 tokens par appel
        const batchSize = 1000;
        for (let i = 0; i < userTokens.length; i += batchSize) {
          const batch = userTokens.slice(i, i + batchSize);

          try {
            const response = await adminMessaging.subscribeToTopic(batch, topic);
            totalSubscribed += response.successCount;
            totalFailed += response.failureCount;

            console.log(`[SUBSCRIBE_ALL] Lot ${i / batchSize + 1}: ${response.successCount} succès, ${response.failureCount} échecs`);

            if (response.failureCount > 0) {
              errors.push(`Utilisateur ${userId}: ${response.failureCount} échecs`);
            }
          } catch (error) {
            console.error(`[SUBSCRIBE_ALL] Erreur lot pour utilisateur ${userId}:`, error);
            totalFailed += batch.length;
            errors.push(`Utilisateur ${userId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          }
        }
      } catch (error) {
        console.error(`[SUBSCRIBE_ALL] Erreur traitement utilisateur ${userId}:`, error);
        errors.push(`Utilisateur ${userId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    console.log("[SUBSCRIBE_ALL] Terminé:", {
      topic,
      totalSubscribed,
      totalFailed,
      errorsCount: errors.length,
    });

    return NextResponse.json({
      success: true,
      topic,
      subscribed: totalSubscribed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("[SUBSCRIBE_ALL] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'abonnement de tous les utilisateurs" },
      { status: 500 }
    );
  }
}
