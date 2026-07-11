import {
  ref,
  set,
  update,
  get,
  onValue,
  off
} from "firebase/database";

import { database } from "@/lib/firebase";

// Types
export type BoardCell = "" | "X" | "O";
export type Board = BoardCell[][];
export type PlayerSymbol = "X" | "O";
export type GameStatus = "playing" | "finished" | "draw";

export interface GameState {
  board: Board;
  playerX: string;
  playerO: string;
  turn: string;
  status: GameStatus;
  winner: string | null;
  startedAt: number;
  turnStartedAt: number;
  winnerLine?: number[][];
}

export interface WinnerResult {
  winner: boolean;
  line: number[][];
  symbol: PlayerSymbol;
}

// Créer un plateau vide 10x10
export function createBoard(): Board {
  const board: Board = [];
  for (let i = 0; i < 10; i++) {
    board.push(Array(10).fill(""));
  }
  return board;
}

// Initialiser le jeu
export async function startGame(roomId: string, playerIds: string[]): Promise<void> {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  
  // Choisir aléatoirement qui commence
  const firstPlayer = Math.random() < 0.5 ? playerIds[0] : playerIds[1];
  
  const gameState: GameState = {
    board: createBoard(),
    playerX: playerIds[0],
    playerO: playerIds[1],
    turn: firstPlayer,
    status: "playing",
    winner: null,
    startedAt: Date.now(),
    turnStartedAt: Date.now()
  };
  
  await set(gameRef, gameState);
}

// Jouer un coup
export async function playMove(
  roomId: string,
  playerId: string,
  row: number,
  col: number
): Promise<{ success: boolean; error?: string; winner?: WinnerResult }> {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  const snapshot = await get(gameRef);
  
  if (!snapshot.exists()) {
    return { success: false, error: "Game not found" };
  }
  
  const game = snapshot.val() as GameState;
  
  // Vérifier que c'est le tour du joueur
  if (game.turn !== playerId) {
    return { success: false, error: "Not your turn" };
  }
  
  // Vérifier que la case est vide
  if (game.board[row][col] !== "") {
    return { success: false, error: "Cell not empty" };
  }
  
  // Déterminer le symbole du joueur
  const symbol: PlayerSymbol = game.playerX === playerId ? "X" : "O";
  
  // Placer le symbole
  const newBoard = [...game.board];
  newBoard[row] = [...newBoard[row]];
  newBoard[row][col] = symbol;
  
  // Vérifier s'il y a un gagnant
  const winnerResult = checkWinner(newBoard, symbol);
  
  // Vérifier match nul
  const isDraw = checkDraw(newBoard);
  
  // Mettre à jour le jeu
  const updates: Partial<GameState> = {
    board: newBoard,
    turnStartedAt: Date.now()
  };
  
  if (winnerResult.winner) {
    updates.winner = playerId;
    updates.status = "finished";
  } else if (isDraw) {
    updates.status = "draw";
  } else {
    // Changer de tour
    updates.turn = game.playerX === playerId ? game.playerO : game.playerX;
  }
  
  await update(gameRef, updates);
  
  return { success: true, winner: winnerResult };
}

// Vérifier s'il y a un gagnant (4 alignés)
export function checkWinner(board: Board, symbol: PlayerSymbol): WinnerResult {
  const size = 10;
  const winLength = 4;
  
  // Vérifier horizontal
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - winLength; col++) {
      let count = 0;
      const line: number[][] = [];
      
      for (let k = 0; k < winLength; k++) {
        if (board[row][col + k] === symbol) {
          count++;
          line.push([row, col + k]);
        }
      }
      
      if (count === winLength) {
        return { winner: true, line, symbol };
      }
    }
  }
  
  // Vérifier vertical
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - winLength; row++) {
      let count = 0;
      const line: number[][] = [];
      
      for (let k = 0; k < winLength; k++) {
        if (board[row + k][col] === symbol) {
          count++;
          line.push([row + k, col]);
        }
      }
      
      if (count === winLength) {
        return { winner: true, line, symbol };
      }
    }
  }
  
  // Vérifier diagonal (haut-gauche vers bas-droite)
  for (let row = 0; row <= size - winLength; row++) {
    for (let col = 0; col <= size - winLength; col++) {
      let count = 0;
      const line: number[][] = [];
      
      for (let k = 0; k < winLength; k++) {
        if (board[row + k][col + k] === symbol) {
          count++;
          line.push([row + k, col + k]);
        }
      }
      
      if (count === winLength) {
        return { winner: true, line, symbol };
      }
    }
  }
  
  // Vérifier diagonal (haut-droite vers bas-gauche)
  for (let row = 0; row <= size - winLength; row++) {
    for (let col = winLength - 1; col < size; col++) {
      let count = 0;
      const line: number[][] = [];
      
      for (let k = 0; k < winLength; k++) {
        if (board[row + k][col - k] === symbol) {
          count++;
          line.push([row + k, col - k]);
        }
      }
      
      if (count === winLength) {
        return { winner: true, line, symbol };
      }
    }
  }
  
  return { winner: false, line: [], symbol };
}

// Vérifier match nul
export function checkDraw(board: Board): boolean {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === "") {
        return false;
      }
    }
  }
  return true;
}

// Écouter les changements du jeu
export function listenToGame(
  roomId: string,
  callback: (game: GameState | null) => void
): () => void {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  
  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return () => off(gameRef);
}

// Abandonner la partie
export async function playerQuit(roomId: string, playerId: string): Promise<void> {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  const snapshot = await get(gameRef);
  
  if (!snapshot.exists()) return;
  
  const game = snapshot.val() as GameState;
  
  // L'autre joueur gagne
  const winnerId = game.playerX === playerId ? game.playerO : game.playerX;
  
  await update(gameRef, {
    status: "finished",
    winner: winnerId
  });
}

// Demander une revanche
export async function requestRematch(roomId: string, playerId: string): Promise<void> {
  const rematchRef = ref(database, `rooms/${roomId}/rematch`);
  
  await update(rematchRef, {
    requestedBy: playerId,
    status: "pending"
  });
}

// Accepter une revanche
export async function acceptRematch(roomId: string): Promise<void> {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  const snapshot = await get(gameRef);
  
  if (!snapshot.exists()) return;
  
  const game = snapshot.val() as GameState;
  
  // Recréer le jeu
  await startGame(roomId, [game.playerX, game.playerO]);
  
  // Réinitialiser rematch
  const rematchRef = ref(database, `rooms/${roomId}/rematch`);
  await set(rematchRef, null);
}

// Écouter les demandes de revanche
export function listenToRematch(
  roomId: string,
  callback: (rematch: any) => void
): () => void {
  const rematchRef = ref(database, `rooms/${roomId}/rematch`);
  
  onValue(rematchRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return () => off(rematchRef);
}
