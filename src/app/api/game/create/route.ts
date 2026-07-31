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
    2. VALIDATION MISE
    ================================================
    */

    const amount =
      Number(bet);


    if (
      !Number.isFinite(amount) ||
      amount < 25
    ) {

      return NextResponse.json(
        {
          success: false,
          error:
            "La mise minimum est de 25 HTG",
        },
        {
          status: 400,
        }
      );

    }


    if (
      amount > 10000
    ) {

      return NextResponse.json(
        {
          success: false,
          error:
            "La mise maximum est de 10 000 HTG",
        },
        {
          status: 400,
        }
      );

    }


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
    5. VÉRIFIER LE SOLDE
    ================================================
    */

    const balance =
      await checkUserBalance(
        uid
      );


    if (
      balance < amount
    ) {

      return NextResponse.json(

        {
          success: false,

          error:
            "Solde insuffisant",
        },

        {
          status: 400,
        }

      );

    }


    /*
    ================================================
    6. DÉDUIRE LA MISE DU CRÉATEUR
    ================================================
    */

    let creatorOldBalance = 0;
    let creatorNewBalance = 0;

    const creatorBalanceRef = adminDB.ref(`users/${uid}/balance`);
    const creatorTransaction = await creatorBalanceRef.transaction((current: any) => {
      creatorOldBalance = Number(current || 0);

      if (creatorOldBalance < amount) {
        console.log("[CREATE_DEBIT_CREATOR] Solde insuffisant:", creatorOldBalance, amount);
        return current;
      }

      creatorNewBalance = creatorOldBalance - amount;
      console.log("[CREATE_DEBIT_CREATOR] Débit créateur:", creatorOldBalance, "->", creatorNewBalance);
      return creatorNewBalance;
    });

    console.log("[CREATE_DEBIT_CREATOR] Résultat transaction:", {
      committed: creatorTransaction.committed,
      snapshot: creatorTransaction.snapshot?.val(),
      expected: creatorNewBalance
    });

    if (!creatorTransaction.committed) {
      return NextResponse.json({
        success: false,
        error: "Échec du débit du créateur - transaction non committed"
      }, {
        status: 500
      });
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
          : "Partie TiTaTo",


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
        amount,


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

          betPaid:
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

    // Créer transaction pour le créateur après avoir le roomId
    await adminDB.ref(`transactions/${uid}`).push({
      type: "bet",
      reason: roomId,
      amount: -amount,
      oldBalance: creatorOldBalance,
      newBalance: creatorNewBalance,
      status: "completed",
      createdAt: Date.now()
    });


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
    NOTIFICATION BROADCAST À TOUS LES UTILISATEURS
    ================================================
    */

    // Envoyer une notification à tous les utilisateurs inscrits
    notificationPromises.push(
      notifyNewGame(roomId, amount, playerName)
        .then(result => {
          console.log("[BROADCAST] Notification envoyée:", result);
        })
        .catch(error => {
          console.error("[BROADCAST] Erreur notification:", error);
        })
    );

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
      DONNÉES NOTIFICATION
      ==============================================
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
      ==============================================
      NOTIFICATION FIRESTORE
      ==============================================
      */

      notificationPromises.push(

        sendPushNotification(

          userId,

          notificationTitle,

          notificationMessage,

          {
            type:
              "game",

            roomId,

            link:
              `/game/${roomId}`,

          }

        )

      );


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