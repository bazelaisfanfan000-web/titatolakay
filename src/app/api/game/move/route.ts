import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  adminDB,
  adminAuth,
} from "@/lib/firebaseAdmin";

import {
  sendPushNotification,
} from "@/lib/broadcastNotification";

import {
  addMonthlyPoints,
} from "@/lib/monthlyChampion";

import {
  rateLimitMiddleware,
  RATE_LIMIT_CONFIGS
} from "@/lib/rateLimit";


// =====================================================
// TYPES
// =====================================================

type SymbolType = "X" | "O";


// =====================================================
// CONSTANTES
// =====================================================

const BOARD_SIZE = 10;
const WIN_LENGTH = 4;


// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {

  try {

    // =================================================
    // RATE LIMITING
    // =================================================

    const rateLimitResult = await rateLimitMiddleware(
      request,
      "gameMove",
      {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60 // 60 coups par minute maximum
      }
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Trop de coups. Réessayez plus tard."
        },
        {
          status: 429,
        }
      );
    }

    // =================================================
    // AUTHENTIFICATION
    // =================================================

    const authHeader =
      request.headers.get(
        "authorization"
      );


    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Non connecté",
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
          error: "Token manquant",
        },
        {
          status: 401,
        }
      );

    }


    const decoded =
      await adminAuth.verifyIdToken(
        token
      );


    const uid =
      decoded.uid;


    // =================================================
    // BODY
    // =================================================

    const body =
      await request.json();


    const roomId =
      typeof body?.roomId === "string"
        ? body.roomId.trim()
        : "";


    const move =
      body?.move;


    if (
      !roomId ||
      !move
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Informations manquantes",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // POSITION
    // =================================================

    const row =
      Number(move.row);


    const col =
      Number(move.col);


    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col)
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Coup invalide",
        },
        {
          status: 400,
        }
      );

    }


    if (
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Position invalide",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // CHARGER LA ROOM
    // =================================================

    const roomRef =
      adminDB.ref(
        `rooms/${roomId}`
      );


    const roomSnap =
      await roomRef.get();


    if (
      !roomSnap.exists()
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Partie inexistante",
        },
        {
          status: 404,
        }
      );

    }


    const room =
      roomSnap.val();


    // =================================================
    // VERIFIER LE JOUEUR
    // =================================================

    const player =
      room.players?.[uid];


    if (!player) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne participez pas à cette partie",
        },
        {
          status: 403,
        }
      );

    }


    const symbol =
      player.symbol as SymbolType;


    if (
      symbol !== "X" &&
      symbol !== "O"
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Symbole joueur invalide",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // CHARGER LE JEU
    // =================================================

    const game =
      room.game;


    if (!game) {

      return NextResponse.json(
        {
          success: false,
          error: "Jeu introuvable",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // PARTIE DEJA TERMINEE
    // =================================================

    if (
      game.status === "finished" ||
      game.winner
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "La partie est déjà terminée",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // VERIFIER LE TOUR
    // =================================================

    if (
      game.turn !== symbol
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Ce n'est pas votre tour",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // BOARD
    // =================================================

    const oldBoard =
      Array.isArray(game.board)
        ? game.board
        : Array.from(
            {
              length: BOARD_SIZE,
            },
            () =>
              Array(
                BOARD_SIZE
              ).fill("")
          );


    const board =
      oldBoard.map(
        (currentRow: any) =>
          Array.isArray(currentRow)
            ? [
                ...currentRow,
              ]
            : Array(
                BOARD_SIZE
              ).fill("")
      );


    // =================================================
    // VERIFIER LA CASE
    // =================================================

    if (
      board[row]?.[col]
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Case déjà utilisée",
        },
        {
          status: 400,
        }
      );

    }


    // =================================================
    // JOUER LE COUP
    // =================================================

    board[row][col] =
      symbol;


    // =================================================
    // VERIFIER GAGNANT
    // =================================================

    const hasWinner =
      checkWinner(
        board,
        row,
        col,
        symbol
      );


    // =================================================
    // VERIFIER MATCH NUL
    // =================================================

    const isDraw =
      !hasWinner &&
      board.every(
        (currentRow: string[]) =>
          currentRow.every(
            (cell: string) =>
              cell !== ""
          )
      );


    // =================================================
    // NOUVEL ETAT
    // =================================================

    const nextTurn =
      symbol === "X"
        ? "O"
        : "X";


    const newStatus =
      hasWinner ||
      isDraw
        ? "finished"
        : "playing";


    const newWinner =
      hasWinner
        ? symbol
        : isDraw
          ? "draw"
          : null;


    const updates: Record<
      string,
      any
    > = {

      board,

      turn:
        newStatus === "finished"
          ? symbol
          : nextTurn,

      turnStartedAt:
        Date.now(),

      status:
        newStatus,

      winner:
        newWinner,

    };


    // =================================================
    // SI LA PARTIE EST TERMINEE
    // =================================================

    if (
      newStatus === "finished"
    ) {

      updates.paymentStatus =
        "pending";

    }


    // =================================================
    // ECRITURE SERVEUR ADMIN
    // =================================================

    await roomRef
      .child("game")
      .update(
        updates
      );


    // =================================================
    // NOTIFICATIONS ET POINTS
    // =================================================

    if (
      hasWinner
    ) {

      try {

        await addMonthlyPoints(
          uid,
          10
        );

      }
      catch (
        pointsError
      ) {

        console.error(
          "[GAME MOVE] Erreur points mensuels",
          pointsError
        );

      }


      try {

        await sendPushNotification(
          uid,
          "🏆 Partie gagnée !",
          "Félicitations ! Tu as remporté la partie.",
          {
            type: "win",
          }
        );

      }
      catch (
        notificationError
      ) {

        console.error(
          "[GAME MOVE] Erreur notification gagnant",
          notificationError
        );

      }


      // =============================================
      // NOTIFICATION DU PERDANT
      // =============================================

      const players =
        room.players || {};


      for (
        const [playerUid] of Object.entries(
          players
        )
      ) {

        if (
          playerUid !== uid
        ) {

          try {

            await sendPushNotification(
              playerUid,
              "😢 Partie perdue",
              "La partie est terminée. Ton adversaire a gagné...",
              {
                type: "lose",
              }
            );

          }
          catch (
            notificationError
          ) {

            console.error(
              "[GAME MOVE] Erreur notification perdant",
              notificationError
            );

          }

        }

      }

    }


    // =================================================
    // MATCH NUL
    // =================================================

    if (
      isDraw
    ) {

      const players =
        room.players || {};


      for (
        const [playerUid] of Object.entries(
          players
        )
      ) {

        try {

          await sendPushNotification(
            playerUid,
            "🤝 Match nul",
            "La partie est terminée sur un match nul.",
            {
              type: "draw",
            }
          );

        }
        catch (
          notificationError
        ) {

          console.error(
            "[GAME MOVE] Erreur notification match nul",
            notificationError
          );

        }

      }

    }


    // =================================================
    // REPONSE
    // =================================================

    return NextResponse.json(
      {

        success: true,

        board,

        turn:
          newStatus === "finished"
            ? symbol
            : nextTurn,

        winner:
          newWinner,

        status:
          newStatus,

        isDraw,

        gameFinished:
          newStatus === "finished",

      },
      {
        status: 200,
      }
    );


  }
  catch (
    error: any
  ) {

    console.error(
      "[GAME MOVE ERROR]",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Erreur serveur",
      },
      {
        status: 500,
      }
    );

  }

}


// =====================================================
// VERIFIER ALIGNEMENT DE 4
// =====================================================

function checkWinner(

  board: string[][],

  row: number,

  col: number,

  symbol: string

): boolean {

  const directions =
    [

      [1, 0],

      [0, 1],

      [1, 1],

      [1, -1],

    ];


  for (
    const [
      dr,
      dc,
    ] of directions
  ) {

    let count =
      1;


    count +=
      countDirection(
        board,
        row,
        col,
        dr,
        dc,
        symbol
      );


    count +=
      countDirection(
        board,
        row,
        col,
        -dr,
        -dc,
        symbol
      );


    if (
      count >= WIN_LENGTH
    ) {

      return true;

    }

  }


  return false;

}


// =====================================================
// COMPTER UNE DIRECTION
// =====================================================

function countDirection(

  board: string[][],

  row: number,

  col: number,

  dr: number,

  dc: number,

  symbol: string

): number {

  let count =
    0;


  let currentRow =
    row + dr;


  let currentCol =
    col + dc;


  while (

    currentRow >= 0 &&

    currentRow < board.length &&

    currentCol >= 0 &&

    currentCol <
      board[0].length &&

    board[currentRow][currentCol] ===
      symbol

  ) {

    count++;


    currentRow +=
      dr;


    currentCol +=
      dc;

  }


  return count;

}