import { adminDB, adminMessaging } from "./firebaseAdmin";

/**
 * Envoie une notification push à tous les utilisateurs enregistrés
 * @param title - Titre de la notification
 * @param body - Message de la notification
 * @param data - Données additionnelles (type, link, roomId, etc.)
 */
export async function sendBroadcastNotification(
  title: string,
  body: string,
  data: {
    type?: string;
    link?: string;
    roomId?: string;
    gameId?: string;
    [key: string]: any;
  }
) {
  try {
    console.log("[BROADCAST] Récupération de tous les tokens FCM...");

    // Récupérer tous les utilisateurs
    const usersSnapshot = await adminDB.ref("users").once("value");

    if (!usersSnapshot.exists()) {
      console.log("[BROADCAST] Aucun utilisateur trouvé");
      return { success: true, sent: 0 };
    }

    const users = usersSnapshot.val();
    const allTokens: string[] = [];

    // Collecter tous les tokens FCM de tous les utilisateurs
    for (const uid in users) {
      const fcmTokensRef = adminDB.ref(`users/${uid}/fcmTokens`);
      const tokensSnapshot = await fcmTokensRef.once("value");

      if (tokensSnapshot.exists()) {
        const tokens = tokensSnapshot.val();
        for (const tokenKey in tokens) {
          const tokenData = tokens[tokenKey];
          if (tokenData.token) {
            allTokens.push(tokenData.token);
          }
        }
      }
    }

    if (allTokens.length === 0) {
      console.log("[BROADCAST] Aucun token FCM trouvé");
      return { success: true, sent: 0 };
    }

    console.log(`[BROADCAST] ${allTokens.length} tokens trouvés`);

    // Diviser en lots de 500 (limite FCM)
    const batchSize = 500;
    const batches: string[][] = [];

    for (let i = 0; i < allTokens.length; i += batchSize) {
      batches.push(allTokens.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Envoyer à chaque lot
    for (const batch of batches) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          data: {
            title,
            body,
            ...data,
          },
          tokens: batch,
        };

        const response = await adminMessaging.sendMulticast(message);

        totalSent += response.successCount;
        totalFailed += response.failureCount;

        // Nettoyer les tokens invalides
        if (response.failureCount > 0) {
          for (let i = 0; i < batch.length; i++) {
            if (!response.responses[i].success) {
              const invalidToken = batch[i];
              await cleanupInvalidToken(invalidToken);
            }
          }
        }
      } catch (error) {
        console.error("[BROADCAST] Erreur envoi lot:", error);
      }
    }

    console.log(`[BROADCAST] Terminé: ${totalSent} envoyés, ${totalFailed} échoués`);

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
    };
  } catch (error) {
    console.error("[BROADCAST] Erreur:", error);
    throw error;
  }
}

/**
 * Envoie une notification push à un utilisateur spécifique
 * @param userId - ID de l'utilisateur Firebase
 * @param title - Titre de la notification
 * @param body - Message de la notification
 * @param data - Données additionnelles (type, link, roomId, etc.)
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: {
    type?: string;
    link?: string;
    roomId?: string;
    gameId?: string;
    amount?: number;
    balance?: number;
    [key: string]: any;
  }
) {
  try {
    console.log("[PUSH] Envoi notification à l'utilisateur:", userId);

    // Récupérer les tokens FCM de l'utilisateur
    const fcmTokensRef = adminDB.ref(`users/${userId}/fcmTokens`);
    const tokensSnapshot = await fcmTokensRef.once("value");

    if (!tokensSnapshot.exists()) {
      console.log("[PUSH] Aucun token FCM trouvé pour l'utilisateur:", userId);
      return { success: true, sent: 0 };
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
      console.log("[PUSH] Aucun token valide pour l'utilisateur:", userId);
      return { success: true, sent: 0 };
    }

    console.log(`[PUSH] ${userTokens.length} tokens trouvés pour l'utilisateur:`, userId);

    // Envoyer la notification
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        ...(data.type ? { type: data.type } : {}),
        ...(data.link ? { link: data.link } : {}),
        ...(data.roomId ? { roomId: data.roomId } : {}),
        ...(data.gameId ? { gameId: data.gameId } : {}),
        ...(data.amount ? { amount: String(data.amount) } : {}),
        ...(data.balance ? { balance: String(data.balance) } : {}),
      },
      tokens: userTokens,
    };

    const response = await adminMessaging.sendMulticast(message);

    console.log(`[PUSH] Résultat: ${response.successCount} envoyés, ${response.failureCount} échoués`);

    // Nettoyer les tokens invalides
    if (response.failureCount > 0) {
      for (let i = 0; i < userTokens.length; i++) {
        if (!response.responses[i].success) {
          const invalidToken = userTokens[i];
          await cleanupInvalidTokenForUser(userId, invalidToken);
        }
      }
    }

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error("[PUSH] Erreur:", error);
    throw error;
  }
}

/**
 * Nettoie un token FCM invalide
 */
async function cleanupInvalidToken(token: string) {
  try {
    const tokenKey = Buffer.from(token).toString("base64url").replace(/[.#$[\]]/g, "_");

    // Chercher ce token chez tous les utilisateurs
    const usersSnapshot = await adminDB.ref("users").once("value");

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();

      for (const uid in users) {
        const tokenRef = adminDB.ref(`users/${uid}/fcmTokens/${tokenKey}`);
        const tokenSnapshot = await tokenRef.once("value");

        if (tokenSnapshot.exists()) {
          const tokenData = tokenSnapshot.val();
          if (tokenData.token === token) {
            await tokenRef.remove();
            console.log(`[BROADCAST] Token invalide supprimé pour l'utilisateur ${uid}`);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error("[BROADCAST] Erreur nettoyage token:", error);
  }
}

/**
 * Nettoie un token FCM invalide pour un utilisateur spécifique
 */
async function cleanupInvalidTokenForUser(userId: string, token: string) {
  try {
    const tokenKey = Buffer.from(token).toString("base64url").replace(/[.#$[\]]/g, "_");
    const tokenRef = adminDB.ref(`users/${userId}/fcmTokens/${tokenKey}`);
    const tokenSnapshot = await tokenRef.once("value");

    if (tokenSnapshot.exists()) {
      const tokenData = tokenSnapshot.val();
      if (tokenData.token === token) {
        await tokenRef.remove();
        console.log(`[PUSH] Token invalide supprimé pour l'utilisateur ${userId}`);
      }
    }
  } catch (error) {
    console.error("[PUSH] Erreur nettoyage token:", error);
  }
}

/**
 * Envoie une notification de nouvelle partie à tous les utilisateurs via Firebase Topic
 * Utilise Topics Messaging pour une meilleure performance avec beaucoup d'utilisateurs
 */
export async function notifyNewGame(
  roomId: string,
  bet: number,
  creatorName: string
) {
  try {
    console.log("[BROADCAST] Vérification de l'existence de la partie avant notification:", roomId);

    // Vérifier que la partie existe réellement dans Firebase
    const roomRef = adminDB.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");

    if (!roomSnapshot.exists()) {
      console.error("[BROADCAST] Partie non trouvée, notification annulée:", roomId);
      return {
        success: false,
        error: "Partie non trouvée",
        roomId,
      };
    }

    const roomData = roomSnapshot.val();
    console.log("[BROADCAST] Partie vérifiée, envoi notification via Topic 'new-games':", {
      roomId,
      status: roomData.status,
      bet: roomData.bet,
    });

    const message = {
      notification: {
        title: "🎮 WinCash",
        body: `🔥 ${creatorName} vient de créer une partie !\n💰 Mise : ${bet} HTG\n\nTouchez pour rejoindre la partie.`,
      },
      data: {
        title: "🎮 WinCash",
        body: `🔥 ${creatorName} vient de créer une partie !\n💰 Mise : ${bet} HTG\n\nTouchez pour rejoindre la partie.`,
        type: "game",
        roomId,
        link: `/join/${roomId}`,
        bet: String(bet),
        creatorName,
        click_action: `/join/${roomId}`,
      },
      topic: "new-games",
      webpush: {
        fcmOptions: {
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${roomId}`,
        },
      },
    };

    const messageId = await adminMessaging.send(message);

    console.log("[BROADCAST] Notification envoyée via Topic:", messageId);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("[BROADCAST] Erreur envoi Topic:", error);
    throw error;
  }
}

/**
 * Envoie une notification de nouvelle partie à tous les utilisateurs (méthode legacy)
 * Gardée pour compatibilité mais déconseillée pour beaucoup d'utilisateurs
 */
export async function notifyNewGameLegacy(
  roomId: string,
  bet: number,
  creatorName: string
) {
  return sendBroadcastNotification(
    "🎮 Nouvelle partie disponible !",
    `${creatorName} a créé une partie de ${bet} HTG. Rejoins-la maintenant !`,
    {
      type: "game",
      roomId,
      link: `/join/${roomId}`,
    }
  );
}
