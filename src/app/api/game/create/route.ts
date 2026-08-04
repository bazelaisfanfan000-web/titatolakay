import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminDB,
  adminAuth,
  adminMessaging,
} from "@/lib/firebaseAdmin";


import {
  checkUserBalance,
} from "@/lib/firebaseEconomyAdmin";


import {
  sendPushNotification,
} from "@/lib/broadcastNotification";


import {
  notifyNewGame,
} from "@/lib/broadcastNotification";


import {
  rateLimitMiddleware,
  RATE_LIMIT_CONFIGS
} from "@/lib/rateLimit";

import {
  validateBet,
} from "@/lib/validation";




/*
====================================================
TYPES
====================================================
*/

type FCMTokenRecord = {

  token?: string;

};


/*
====================================================
POST CREATE ROOM
====================================================
*/

export async function POST(
  request: Request
) {

  try {

    /*
    ================================================
    0. RATE LIMITING
    ================================================
    */

    const rateLimitResult = await rateLimitMiddleware(
      request,
      "gameCreate",
      RATE_LIMIT_CONFIGS.gameCreate
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Trop de requêtes. Réessayez plus tard."
        },
        {
          status: 429,
        }
      );
    }

    /*
    ================================================
    1. VÉRIFIER FIREBASE ADMIN
    ================================================
    */

    const body = await request.json();

    if (!adminAuth || !adminDB) {

      console.error(
        "CREATE ROOM: Firebase Admin non initialisé"
      );

      return NextResponse.json(

        {
          success: false,

          error:
            "Service Firebase non disponible. Réessayez plus tard.",
        },

        {
          status: 503,
        }

      );

    }


    /*
    ================================================
    1. LIRE LES DONNÉES
    ================================================
    */

    const {
      name,
      bet,
      mode,
      gameType,
      friendId,
    } = body;


    /*
    ================================================
    2. VALIDATION MISE STRICTE
    ================================================
    */

    const betValidation = validateBet(bet);

    if (!betValidation.valid) {

      return NextResponse.json(
        {
          success: false,
          error: betValidation.error || "Mise invalide"
        },
        {
          status: 400,
        }
      );

    }

    const amount = betValidation.value!;


    /*
    ================================================
    3. AUTHORIZATION HEADER
    ================================================
    */

    const authHeader =
      request.headers.get(
        "authorization"
      );


    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return NextResponse.json(

        {
          success: false,

          error:
            "Token manquant",
        },

        {
          status: 401,
        }

      );

    }


    const token =
      authHeader
        .replace(
          "Bearer ",
          ""
        )
        .trim();


    if (!token) {

      return NextResponse.json(

        {
          success: false,

          error:
            "Token vide",
        },

        {
          status: 401,
        }

      );

    }


    /*
    ================================================
    4. VÉRIFIER TOKEN FIREBASE
    ================================================
    */

    let decoded;

    try {

      decoded =
        await adminAuth.verifyIdToken(
          token
        );

    } catch (error) {

      console.error(
        "FIREBASE AUTH ERROR:",
        error
      );


      return NextResponse.json(

        {
          success: false,

          error:
            "Token Firebase invalide",
        },

        {
          status: 401,
        }

      );

    }


    const uid =
      decoded.uid;


    console.log(
      "CREATE ROOM:",
      {
        uid,
        amount,
        mode,
        gameType,
        friendId,
      }
    );


    /*
    ================================================
    5. VÉRIFIER SOLDE DU CRÉATEUR
    ================================================
    */

    const balanceSnap =
      await adminDB
        .ref(`users/${uid}/balance`)
        .once("value");

    const balance =
      Number(balanceSnap.val() || 0);

    if (balance < amount) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Solde insuffisant pour créer cette partie"
        },
        {
          status: 400,
        }
      );

    }

    console.log(
      "CREATE ROOM: Balance vérifiée:",
      { uid, balance, amount }
    );

    /*
    ================================================
    6. VÉRIFIER MISE MINIMUM (50% du solde) SI PREMIÈRE PARTIE
    ================================================
    */

    const userSnap = await adminDB.ref(`users/${uid}`).once("value");
    const userData = userSnap.val();
    const firstGamePlayed = userData.firstGamePlayed === true;

    console.log("[CREATE ROOM] Vérification mise minimum:", {
      uid,
      balance,
      amount,
      firstGamePlayed,
      firstGamePlayedRaw: userData.firstGamePlayed
    });

    // Si le joueur n'a pas encore joué sa première partie après le dépôt
    if (!firstGamePlayed) {
      const minimumBet = Math.round(balance * 0.5);
      
      if (amount < minimumBet) {
        console.log("[CREATE ROOM] Mise insuffisante (doit être >= 50% du solde):", {
          uid,
          amount,
          minimumBet,
          balance,
          firstGamePlayed
        });
        
        return NextResponse.json(
          {
            success: false,
            error: `La mise minimum est de ${minimumBet} HTG (50% de votre solde de ${balance} HTG) !`
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    ================================================
    7. CONFIGURATION PARTIE
    ================================================
    */

    const maxPlayers =
      mode === "2v2"
        ? 4
        : 2;


    /*
    ================================================
    8. CRÉER ROOM
    ================================================
    */

    const newRoomRef =
      adminDB
        .ref("rooms")
        .push();


    const roomId =
      newRoomRef.key;


    if (!roomId) {

      throw new Error(
        "Room ID impossible"
      );

    }


    /*
    ================================================
    9. NOM DU JOUEUR
    ================================================
    */

    const playerName =
      decoded.name ||
      decoded.email ||
      "Joueur";


    const now =
      Date.now();


    /*
    ================================================
    10. DONNÉES ROOM
    ================================================
    */

    const roomData = {

      id:
        roomId,


      name:
        typeof name === "string" &&
        name.trim()
          ? name.trim()
          : "Partie Wincash",


      bet:
        amount,


      mode:
        mode || "1v1",


      gameType:
        gameType || "titato",


      creatorId:
        uid,


      status:
        "waiting",


      playersCount:
        1,


      maxPlayers,


      pot:
        0,


      createdAt:
        now,


      updatedAt:
        now,


      players: {

        [uid]: {

          uid,

          name:
            playerName,

          symbol:
            "X",

          ready:
            true,

          joinedAt:
            now,

        },

      },

    };


    /*
    ================================================
    11. ENREGISTRER ROOM
    ================================================
    */

    await newRoomRef.set(
      roomData
    );


    console.log(
      "ROOM CREATED:",
      roomId
    );

    /*
    ================================================
    11.5. VÉRIFIER QUE LA PARTIE EXISTE RÉELLEMENT
    ================================================
    */

    const roomVerification = await newRoomRef.once("value");
    if (!roomVerification.exists()) {
      console.error("[GAME CREATE] Partie non créée dans Firebase après set()");
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la création de la partie"
        },
        {
          status: 500
        }
      );
    }

    console.log("[GAME CREATE] Partie vérifiée dans Firebase:", roomId);


    /*
    ================================================
    12. RÉCUPÉRER USERS
    ================================================
    */

    let users:
      Record<
        string,
        any
      > = {};


    try {

      const usersSnapshot =
        await adminDB
          .ref("users")
          .once("value");


      if (
        usersSnapshot.exists()
      ) {

        users =
          usersSnapshot.val() || {};

      }

    } catch (error) {

      console.error(
        "USERS READ ERROR:",
        error
      );

    }


    /*
    ================================================
    13. DÉTERMINER DESTINATAIRES
    ================================================
    */

    const recipientIds:
      string[] = [];


    /*
    -----------------------------------------------
    INVITATION PRIVÉE
    -----------------------------------------------
    */

    if (
      friendId &&
      typeof friendId === "string" &&
      friendId !== uid
    ) {

      recipientIds.push(
        friendId
      );

    }


    /*
    -----------------------------------------------
    NOUVELLE PARTIE PUBLIQUE
    -----------------------------------------------
    */

    else {

      for (
        const userId
        of Object.keys(users)
      ) {

        if (
          userId === uid
        ) {

          continue;

        }


        recipientIds.push(
          userId
        );

      }

    }


    /*
    ================================================
    14. NOTIFICATIONS
    ================================================
    */

    const notificationPromises:
      Promise<any>[] = [];

    /*
    ================================================
    DONNÉES NOTIFICATION
    ================================================
    */

    const notificationTitle =
      friendId
        ? "🎮 Invitation partie"
        : "🎮 Nouvelle partie disponible";

    const notificationMessage =
      friendId
        ? `${playerName} t'invite à rejoindre une partie de ${amount} HTG.`
        : `${playerName} a créé une partie de ${amount} HTG. Rejoins-la maintenant !`;

    /*
    ================================================
    NOTIFICATION BROADCAST À TOUS LES UTILISATEURS
    ================================================
    */

    // Envoyer une notification à tous les utilisateurs inscrits
    // SEULEMENT si c'est une partie publique (pas de friendId)
    if (!friendId) {
      notificationPromises.push(
        notifyNewGame(roomId, amount, playerName)
          .then(result => {
            if (result.success) {
              console.log("[BROADCAST] Notification envoyée:", result);
            } else {
              console.warn("[BROADCAST] Notification non envoyée:", result.error);
            }
          })
          .catch(error => {
            console.error("[BROADCAST] Erreur notification:", error);
          })
      );
    }

    /*
    ================================================
    15. BOUCLE DESTINATAIRES
    ================================================
    */

    for (
      const userId
      of recipientIds
    ) {

      /*
      ==============================================
      NOTIFICATION INDIVIDUELLE (SEULEMENT POUR PARTIE PRIVÉE)
      ==============================================
      */

      // Envoyer notification individuelle SEULEMENT si c'est une partie privée (friendId)
      if (friendId) {
        notificationPromises.push(
          sendPushNotification(
            userId,
            notificationTitle,
            notificationMessage,
            {
              type: "game",
              roomId,
              link: `/game/${roomId}`,
            }
          )
        );
      }

      /*
      ==============================================
      NOTIFICATION FIRESTORE
      ==============================================
      */


      /*
      ==============================================
      RÉCUPÉRER LES TOKENS FCM
      ==============================================
      */

      const user =
        users[userId];


      const fcmTokens =
        user?.fcmTokens;


      if (
        !fcmTokens ||
        typeof fcmTokens !== "object"
      ) {

        continue;

      }


      /*
      ==============================================
      BOUCLE TOKENS
      ==============================================
      */

      for (
        const tokenKey
        of Object.keys(
          fcmTokens
        )
      ) {

        const tokenRecord:
          FCMTokenRecord =
          fcmTokens[tokenKey];


        const fcmToken =
          tokenRecord?.token;


        /*
        ==========================================
        TOKEN INVALIDE DANS LA BASE
        ==========================================
        */

        if (
          !fcmToken ||
          typeof fcmToken !== "string"
        ) {

          continue;

        }


        /*
        ==========================================
        ENVOYER PUSH FCM
        ==========================================
        */

        const pushPromise =

          adminMessaging
            .send({

              token:
                fcmToken,


              notification: {

                title:
                  notificationTitle,

                body:
                  notificationMessage,

              },


              data: {

                title:
                  notificationTitle,

                body:
                  notificationMessage,

                type:
                  "game",

                gameId: roomId,

                roomId,

                link:
                  `/join/${roomId}`,

              },


              webpush: {

                fcmOptions: {

                  link:
                    `/join/${roomId}`,

                },

              },

            })

            .then(
              () => {

                console.log(
                  "FCM PUSH SENT:",
                  {
                    userId,
                    roomId,
                  }
                );

              }
            )

            .catch(
              async (
                error: any
              ) => {

                console.error(
                  "FCM PUSH ERROR:",
                  {
                    userId,
                    tokenKey,
                    error:
                      error?.message ||
                      error,
                  }
                );


                /*
                ==================================
                TOKEN EXPIRÉ OU INVALIDE
                ==================================
                */

                const errorCode =
                  error?.code ||
                  "";


                const invalidToken =
                  errorCode ===
                    "messaging/registration-token-not-registered" ||

                  errorCode ===
                    "messaging/invalid-registration-token";


                if (
                  invalidToken
                ) {

                  try {

                    await adminDB
                      .ref(
                        `users/${userId}/fcmTokens/${tokenKey}`
                      )
                      .remove();


                    console.log(
                      "FCM TOKEN SUPPRIMÉ:",
                      {
                        userId,
                        tokenKey,
                      }
                    );

                  } catch (
                    removeError
                  ) {

                    console.error(
                      "FCM TOKEN REMOVE ERROR:",
                      removeError
                    );

                  }

                }

              }
            );


        notificationPromises.push(
          pushPromise
        );

      }

    }


    /*
    ================================================
    16. ATTENDRE NOTIFICATIONS
    ================================================
    */

    const results =
      await Promise.allSettled(
        notificationPromises
      );


    /*
    ================================================
    17. STATISTIQUES
    ================================================
    */

    const successful =
      results.filter(
        result =>
          result.status ===
          "fulfilled"
      ).length;


    const failed =
      results.filter(
        result =>
          result.status ===
          "rejected"
      ).length;


    console.log(
      "GAME NOTIFICATIONS FINISHED:",
      {

        roomId,

        recipients:
          recipientIds.length,

        successful,

        failed,

      }
    );


    /*
    ================================================
    18. RÉPONSE
    ================================================
    */

    return NextResponse.json(

      {

        success:
          true,

        roomId,

        status:
          "waiting",

      },

      {

        status:
          200,

      }

    );


  } catch (
    error: any
  ) {

    /*
    ================================================
    ERREUR GLOBALE
    ================================================
    */

    console.error(
      "CREATE ROOM CRASH:",
      error
    );


    return NextResponse.json(

      {

        success:
          false,

        error:
          error?.message ||
          "Erreur serveur création partie",

      },

      {

        status:
          500,

      }

    );

  }

}