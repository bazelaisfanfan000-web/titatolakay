import {
  ref,
  update,
  get,
  onValue,
  off
} from "firebase/database";

import { database } from "@/lib/firebase";
import { playMove } from "./titatoEngine";

// Types
export interface TimerState {
  timeLeft: number;
  warning: boolean;
  timeoutCount: { [playerId: string]: number };
  lastTimeout: { [playerId: string]: number };
}

export interface TimerConfig {
  turnDuration: number; // 30 secondes
  warningThreshold: number; // 5 secondes
  maxTimeouts: number; // 3 timeouts avant défaite
}

const DEFAULT_CONFIG: TimerConfig = {
  turnDuration: 30,
  warningThreshold: 5,
  maxTimeouts: 3
};

// Démarrer le timer pour un tour
export async function startTurnTimer(roomId: string, playerId: string): Promise<void> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  
  await update(timerRef, {
    timeLeft: DEFAULT_CONFIG.turnDuration,
    warning: false,
    currentPlayer: playerId,
    turnStartedAt: Date.now()
  });
}

// Mettre à jour le timer (appelé chaque seconde)
export async function updateTimer(roomId: string): Promise<void> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  const snapshot = await get(timerRef);
  
  if (!snapshot.exists()) return;
  
  const timer = snapshot.val() as TimerState;
  
  if (timer.timeLeft > 0) {
    const newTimeLeft = timer.timeLeft - 1;
    const warning = newTimeLeft <= DEFAULT_CONFIG.warningThreshold;
    
    await update(timerRef, {
      timeLeft: newTimeLeft,
      warning
    });
  }
}

// Gérer le timeout d'un joueur
export async function handleTimeout(roomId: string, playerId: string): Promise<{ action: string; message: string }> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  const snapshot = await get(timerRef);
  
  if (!snapshot.exists()) {
    return { action: "error", message: "Timer not found" };
  }
  
  const timer = snapshot.val() as TimerState;
  
  // Initialiser les compteurs de timeout si nécessaire
  const timeoutCount = timer.timeoutCount || {};
  const playerTimeouts = timeoutCount[playerId] || 0;
  
  const newTimeoutCount = playerTimeouts + 1;
  
  if (newTimeoutCount >= DEFAULT_CONFIG.maxTimeouts) {
    // 3ème timeout - défaite automatique
    await update(timerRef, {
      timeoutCount: {
        ...timeoutCount,
        [playerId]: newTimeoutCount
      }
    });
    
    // Marquer l'autre joueur comme gagnant
    const gameRef = ref(database, `rooms/${roomId}/game`);
    const gameSnapshot = await get(gameRef);
    
    if (gameSnapshot.exists()) {
      const game = gameSnapshot.val();
      const winnerId = game.playerX === playerId ? game.playerO : game.playerX;
      
      await update(gameRef, {
        status: "finished",
        winner: winnerId,
        reason: "timeout"
      });
    }
    
    return { action: "defeat", message: "Défaite par timeout" };
  }
  
  // Jouer automatiquement une case vide au hasard
  const gameRef = ref(database, `rooms/${roomId}/game`);
  const gameSnapshot = await get(gameRef);
  
  if (!gameSnapshot.exists()) {
    return { action: "error", message: "Game not found" };
  }
  
  const game = gameSnapshot.val();
  const board = game.board;
  
  // Trouver une case vide
  const emptyCells: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === "") {
        emptyCells.push({ row, col });
      }
    }
  }
  
  if (emptyCells.length === 0) {
    return { action: "draw", message: "Match nul" };
  }
  
  // Choisir une case aléatoire
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  
  // Jouer le coup automatiquement
  await playMove(roomId, playerId, randomCell.row, randomCell.col);
  
  // Mettre à jour le compteur de timeout
  await update(timerRef, {
    timeoutCount: {
      ...timeoutCount,
      [playerId]: newTimeoutCount
    },
    lastTimeout: {
      ...(timer.lastTimeout || {}),
      [playerId]: Date.now()
    }
  });
  
  const warningLevel = newTimeoutCount === 1 ? "1/3" : "2/3";
  return { 
    action: "auto_play", 
    message: `Coup automatique (avertissement ${warningLevel})` 
  };
}

// Réinitialiser le timer
export async function resetTimer(roomId: string): Promise<void> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  
  await update(timerRef, {
    timeLeft: DEFAULT_CONFIG.turnDuration,
    warning: false
  });
}

// Écouter les changements du timer
export function listenToTimer(
  roomId: string,
  callback: (timer: TimerState | null) => void
): () => void {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  
  onValue(timerRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return () => off(timerRef);
}

// Obtenir le temps restant
export async function getTimeLeft(roomId: string): Promise<number> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  const snapshot = await get(timerRef);
  
  if (!snapshot.exists()) return DEFAULT_CONFIG.turnDuration;
  
  const timer = snapshot.val() as TimerState;
  return timer.timeLeft || DEFAULT_CONFIG.turnDuration;
}

// Vérifier si c'est en période d'avertissement
export async function isWarningPeriod(roomId: string): Promise<boolean> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  const snapshot = await get(timerRef);
  
  if (!snapshot.exists()) return false;
  
  const timer = snapshot.val() as TimerState;
  return timer.warning || false;
}

// Obtenir le nombre de timeouts d'un joueur
export async function getPlayerTimeouts(roomId: string, playerId: string): Promise<number> {
  const timerRef = ref(database, `rooms/${roomId}/timer`);
  const snapshot = await get(timerRef);
  
  if (!snapshot.exists()) return 0;
  
  const timer = snapshot.val() as TimerState;
  const timeoutCount = timer.timeoutCount || {};
  return timeoutCount[playerId] || 0;
}
