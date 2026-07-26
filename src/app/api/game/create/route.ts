import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import {
  adminDB,
  adminAuth,
} from "@/lib/firebaseAdmin";

import {
  checkUserBalance,
  deductBet,
} from "@/lib/firebaseEconomyAdmin";

import {
  sendNotification,
} from "@/lib/notifications";


export async function POST(
  request: Request
) {

  try {

    // =========================================
    // LIRE LES DONNÉES
    // =========================================

    const body =
      await request.json();


    const {
      name,
      bet,
      mode,
      gameType,
      friendId,
    } = body;


    // =========================================
    // VALIDATION MISE
    // =========================================

    const amount =
      Number(bet);


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Mise invalide",
        },
        {
          status: 400,
        }
      );

    }


    // =========================================
    // AUTH TOKEN
    // =========================================

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
          error: "Token manquant",
        },
        {
          status: 401,
        }
      );

    }


    const token =
      authHeader.replace(
        "Bearer ",
        ""
      ).trim();


    if (!token) {

      return NextResponse.json(
        {
          success: false,
          error: "Token vide",
        },
        {
          status: 401,
        }
      );

    }


    // =========================================
    // VÉRIFIER TOKEN FIREBASE
    // =========================================

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
          error: "Token Firebase invalide",
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


    // =========================================
    // VÉRIFIER LE SOLDE
    // =========================================

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
            `Solde insuffisant (${balance} HTG)`,
        },
        {
          status: 400,
        }
      );

    }


    // =========================================
    // DÉDUIRE LA MISE
    // =========================================

    await deductBet(
      uid,
      amount,
      "create-room"
    );


    // =========================================
    // CONFIGURATION PARTIE
    // =========================================

    const maxPlayers =
      mode === "2v2"
        ? 4
        : 2;


    // =========================================
    // CRÉER ROOM
    // =========================================

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


    // =========================================
    // NOM DU JOUEUR
    // =========================================

    const playerName =
      decoded.name ||
      decoded.email ||
      "Joueur";


    const now =
      Date.now();


    // =========================================
    // DONNÉES ROOM
    // =========================================

    const roomData = {

      id: roomId,

      name:
        typeof name === "string" &&
        name.trim()
          ? name.trim()
          : "Partie TiTaTo",

      bet: amount,

      mode:
        mode || "1v1",

      gameType:
        gameType || "titato",

      creatorId: uid,

      status: "waiting",

      playersCount: 1,

      maxPlayers,

      pot: amount,

      createdAt: now,

      updatedAt: now,

      players: {

        [uid]: {

          uid,

          name: playerName,

          symbol: "X",

          ready: true,

          betPaid: true,

          joinedAt: now,

        },

      },

    };


    // =========================================
    // ENREGISTRER ROOM
    // =========================================

    await newRoomRef.set(
      roomData
    );


    console.log(
      "ROOM CREATED:",
      roomId
    );


    // =========================================
    // INVITATION AMI
    // =========================================

    if (
      friendId &&
      typeof friendId === "string" &&
      friendId !== uid
    ) {

      try {

        await sendNotification(
          friendId,
          {
            title:
              "🎮 Invitation partie",

            message:
              `${playerName} t'invite à rejoindre une partie.`,

            type:
              "game",

            roomId,

          }
        );

      } catch (
        notificationError
      ) {

        console.error(
          "NOTIFICATION ERROR:",
          notificationError
        );

        // La chambre existe déjà.
        // Une erreur de notification
        // ne doit pas faire échouer
        // la création de la partie.

      }

    }


    // =========================================
    // RÉPONSE
    // =========================================

    return NextResponse.json(

      {

        success: true,

        roomId,

        status: "waiting",

      },

      {

        status: 200,

      }

    );


  } catch (
    error: any
  ) {

    console.error(
      "CREATE ROOM CRASH:",
      error
    );


    return NextResponse.json(

      {

        success: false,

        error:
          error?.message ||
          "Erreur serveur création partie",

      },

      {

        status: 500,

      }

    );

  }

}