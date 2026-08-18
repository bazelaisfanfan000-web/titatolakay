"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Difficulty = "easy" | "medium" | "impossible";

export default function TrainingPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [board, setBoard] = useState<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill(""))
  );
  const [playerTurn, setPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState({ player: 0, bot: 0 });
  const [botThinking, setBotThinking] = useState(false);
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);

  const difficultySettings = {
    easy: { name: "Facile", color: "green", description: "Bot aléatoire", emoji: "😀" },
    medium: { name: "Moyen", color: "yellow", description: "Bot stratégique", emoji: "👿" },
    impossible: { name: "Impossible", color: "red", description: "Bot invincible", emoji: "🔥" },
  };

  const handleCellClick = (row: number, col: number) => {
    if (!playerTurn || board[row][col] !== "" || winner !== null || botThinking) return;

    const newBoard = [...board.map(row => [...row])];
    newBoard[row][col] = "X";
    setBoard(newBoard);
    setPlayerTurn(false);
    setBotThinking(true);

    // Vérifier victoire
    if (checkWin(newBoard, "X")) {
      setWinner("X");
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
      setBotThinking(false);
      setShowVictoryScreen(true);
      return;
    }

    // Tour du bot après délai
    setTimeout(() => {
      try {
        botMove(newBoard);
      } catch (error) {
        console.error("Bot move error:", error);
        // Fallback: jouer aléatoirement si erreur
        const fallbackBoard = [...newBoard.map(row => [...row])];
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            if (fallbackBoard[r][c] === "") {
              fallbackBoard[r][c] = "O";
              setBoard(fallbackBoard);
              setPlayerTurn(true);
              setBotThinking(false);
              return;
            }
          }
        }
      }
    }, 200);
  };

  const botMove = (currentBoard: string[][]) => {
    if (winner !== null) {
      console.log("Bot move cancelled - game already won");
      return;
    }

    console.log("Bot is thinking...", difficulty);
    let newBoard = [...currentBoard.map(row => [...row])];
    let moveMade = false;

    // Stratégie selon difficulté
    if (difficulty === "easy") {
      // Facile - Stratégie de base avec logique simple
      // 1. Essayer de gagner (30% de chance)
      if (Math.random() < 0.3) {
        moveMade = tryWinOrBlock(newBoard, "O");
      }
      // 2. Jouer au centre si disponible (40% de chance)
      if (!moveMade && Math.random() < 0.4 && newBoard[5][5] === "") {
        newBoard[5][5] = "O";
        moveMade = true;
      }
      // 3. Jouer près des pièces existantes (créer des lignes)
      if (!moveMade && Math.random() < 0.5) {
        moveMade = playNearExisting(newBoard);
      }
      // 4. Sinon aléatoire (TOUJOURS jouer si rien d'autre)
      if (!moveMade) {
        const emptyCells: [number, number][] = [];
        newBoard.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell === "") emptyCells.push([r, c]);
          });
        });
        if (emptyCells.length > 0) {
          const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
          newBoard[r][c] = "O";
          moveMade = true;
        }
      }
    } else if (difficulty === "medium") {
      // Moyen - Stratégie intermédiaire
      // 1. Essayer de gagner (80% de chance)
      if (Math.random() < 0.8) {
        moveMade = tryWinOrBlock(newBoard, "O");
      }
      // 2. Bloquer le joueur (70% de chance)
      if (!moveMade && Math.random() < 0.7) {
        moveMade = tryWinOrBlock(newBoard, "X");
      }
      // 3. Jouer au centre
      if (!moveMade && newBoard[5][5] === "") {
        newBoard[5][5] = "O";
        moveMade = true;
      }
      // 4. Créer des menaces simples (3 alignés)
      if (!moveMade && Math.random() < 0.6) {
        moveMade = createSimpleThreat(newBoard);
      }
      // 5. Jouer dans un coin
      if (!moveMade) {
        const corners = [[0, 0], [0, 9], [9, 0], [9, 9]];
        for (const [r, c] of corners) {
          if (newBoard[r][c] === "") {
            newBoard[r][c] = "O";
            moveMade = true;
            break;
          }
        }
      }
      // 6. Jouer près des pièces existantes
      if (!moveMade) moveMade = playNearExisting(newBoard);
      // 7. Sinon aléatoire (TOUJOURS jouer si rien d'autre)
      if (!moveMade) {
        const emptyCells: [number, number][] = [];
        newBoard.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell === "") emptyCells.push([r, c]);
          });
        });
        if (emptyCells.length > 0) {
          const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
          newBoard[r][c] = "O";
          moveMade = true;
        }
      }
    } else if (difficulty === "impossible") {
      // Impossible - Stratégie invincible avec Minimax profond
      const bestMove = findBestMoveMinimax(newBoard, 6); // Profondeur 6 pour invincibilité
      if (bestMove) {
        const [r, c] = bestMove;
        newBoard[r][c] = "O";
        moveMade = true;
      }
      
      // Fallback si Minimax échoue
      if (!moveMade) {
        // 1. Essayer de gagner immédiatement
        moveMade = tryWinOrBlock(newBoard, "O");
        // 2. Bloquer TOUTES les menaces du joueur
        if (!moveMade) {
          const threats = findThreats(newBoard, "X");
          if (threats.length > 0) {
            const [r, c] = threats[0];
            newBoard[r][c] = "O";
            moveMade = true;
          }
        }
        // 3. Créer des menaces multiples (fork)
        if (!moveMade) moveMade = createFork(newBoard);
        // 4. Contrôler le centre
        if (!moveMade && newBoard[5][5] === "") {
          newBoard[5][5] = "O";
          moveMade = true;
        }
        // 5. Jouer dans les coins stratégiques
        if (!moveMade) {
          const strategicCorners = findBestCorner(newBoard);
          if (strategicCorners) {
            const [r, c] = strategicCorners;
            newBoard[r][c] = "O";
            moveMade = true;
          }
        }
        // 6. Jouer près des pièces existantes pour créer des lignes
        if (!moveMade) moveMade = playNearExisting(newBoard);
        // 7. Dernier recours : aléatoire
        if (!moveMade) {
          const emptyCells: [number, number][] = [];
          newBoard.forEach((row, r) => {
            row.forEach((cell, c) => {
              if (cell === "") emptyCells.push([r, c]);
            });
          });
          if (emptyCells.length > 0) {
            const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            newBoard[r][c] = "O";
            moveMade = true;
          }
        }
      }
    } else {
      // Si la difficulté n'est pas définie, jouer aléatoirement
      console.log("Unknown difficulty, playing randomly");
      const emptyCells: [number, number][] = [];
      newBoard.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell === "") emptyCells.push([r, c]);
        });
      });
      if (emptyCells.length > 0) {
        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        newBoard[r][c] = "O";
        moveMade = true;
      }
    }

    // Fallback ultime - jouer n'importe où si rien n'a fonctionné
    if (!moveMade) {
      console.log("All strategies failed, using ultimate fallback");
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (newBoard[r][c] === "") {
            newBoard[r][c] = "O";
            moveMade = true;
            break;
          }
        }
        if (moveMade) break;
      }
    }

    setBoard(newBoard);
    setPlayerTurn(true);
    setBotThinking(false);

    console.log("Bot made move at", moveMade ? "valid position" : "no position");

    if (checkWin(newBoard, "O")) {
      setWinner("O");
      setScore(prev => ({ ...prev, bot: prev.bot + 1 }));
    }
  };

  // Créer une menace simple (3 alignés) pour le niveau moyen
  const createSimpleThreat = (board: string[][]): boolean => {
    const n = 10;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "") {
          for (const [dr, dc] of directions) {
            // Vérifier si on peut créer 3 alignés
            let count = 1;
            let emptyAfter = false;
            
            // Vérifier dans une direction
            for (let i = 1; i < 4; i++) {
              const nr = r + dr * i;
              const nc = c + dc * i;
              if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                if (board[nr][nc] === "O") count++;
                else if (board[nr][nc] === "") emptyAfter = true;
                else break;
              }
            }
            
            // Vérifier dans l'autre direction
            for (let i = 1; i < 4; i++) {
              const nr = r - dr * i;
              const nc = c - dc * i;
              if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                if (board[nr][nc] === "O") count++;
                else if (board[nr][nc] === "") emptyAfter = true;
                else break;
              }
            }
            
            if (count >= 2 && emptyAfter) {
              board[r][c] = "O";
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  // Trouver toutes les menaces (4 alignés qui peuvent devenir 5)
  const findThreats = (board: string[][], symbol: string): [number, number][] => {
    const threats: [number, number][] = [];
    const n = 10;
    const winLength = 5;

    // Vérifier toutes les directions
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "") {
          // Simuler placement
          board[r][c] = symbol;
          if (checkWin(board, symbol)) {
            threats.push([r, c]);
          }
          board[r][c] = "";
        }
      }
    }
    return threats;
  };

  // Créer une fourchette (deux menaces simultanées)
  const createFork = (board: string[][]): boolean => {
    const n = 10;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "") {
          board[r][c] = "O";
          const threats = findThreats(board, "O");
          board[r][c] = "";
          if (threats.length >= 2) {
            board[r][c] = "O";
            return true;
          }
        }
      }
    }
    return false;
  };

  // Trouver le meilleur coin
  const findBestCorner = (board: string[][]): [number, number] | null => {
    const corners = [
      [0, 0], [0, 9], [9, 0], [9, 9],
      [0, 4], [0, 5], [9, 4], [9, 5],
      [4, 0], [5, 0], [4, 9], [5, 9]
    ];
    for (const [r, c] of corners) {
      if (board[r][c] === "") {
        return [r, c];
      }
    }
    return null;
  };

  // Jouer près des pièces existantes
  const playNearExisting = (board: string[][]): boolean => {
    const n = 10;
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "O") {
          // Chercher une case vide adjacente
          for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === "") {
              board[nr][nc] = "O";
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  // Minimax avec Alpha-Beta Pruning pour le niveau impossible
  const findBestMoveMinimax = (board: string[][], depth: number): [number, number] | null => {
    let bestScore = -Infinity;
    let bestMove: [number, number] | null = null;
    const n = 10;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "") {
          board[r][c] = "O";
          const score = minimax(board, depth - 1, false, -Infinity, Infinity);
          board[r][c] = "";
          
          if (score > bestScore) {
            bestScore = score;
            bestMove = [r, c];
          }
        }
      }
    }

    return bestMove;
  };

  const minimax = (board: string[][], depth: number, isMaximizing: boolean, alpha: number, beta: number): number => {
    // Vérifier si le jeu est terminé
    if (checkWin(board, "O")) return 1000 + depth; // Gagner vite est mieux
    if (checkWin(board, "X")) return -1000 - depth; // Perdre vite est pire
    if (depth === 0) return evaluateBoard(board);

    const n = 10;
    const emptyCells: [number, number][] = [];
    
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "") emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length === 0) return 0; // Match nul

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const [r, c] of emptyCells) {
        board[r][c] = "O";
        const score = minimax(board, depth - 1, false, alpha, beta);
        board[r][c] = "";
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const [r, c] of emptyCells) {
        board[r][c] = "X";
        const score = minimax(board, depth - 1, true, alpha, beta);
        board[r][c] = "";
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  };

  // Évaluer le plateau pour le Minimax
  const evaluateBoard = (board: string[][]): number => {
    let score = 0;
    const n = 10;

    // Évaluer chaque ligne
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - 5; c++) {
        const segment = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3], board[r][c+4]];
        score += evaluateSegment(segment);
      }
    }

    // Évaluer chaque colonne
    for (let c = 0; c < n; c++) {
      for (let r = 0; r <= n - 5; r++) {
        const segment = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c], board[r+4][c]];
        score += evaluateSegment(segment);
      }
    }

    // Évaluer diagonales
    for (let r = 0; r <= n - 5; r++) {
      for (let c = 0; c <= n - 5; c++) {
        const segment = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3], board[r+4][c+4]];
        score += evaluateSegment(segment);
      }
    }

    // Évaluer anti-diagonales
    for (let r = 0; r <= n - 5; r++) {
      for (let c = 4; c < n; c++) {
        const segment = [board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3], board[r+4][c-4]];
        score += evaluateSegment(segment);
      }
    }

    return score;
  };

  // Évaluer un segment de 5 cases
  const evaluateSegment = (segment: string[]): number => {
    const oCount = segment.filter(c => c === "O").length;
    const xCount = segment.filter(c => c === "X").length;
    const emptyCount = segment.filter(c => c === "").length;

    if (oCount === 5) return 1000;
    if (xCount === 5) return -1000;
    if (oCount === 4 && emptyCount === 1) return 100;
    if (xCount === 4 && emptyCount === 1) return -100;
    if (oCount === 3 && emptyCount === 2) return 10;
    if (xCount === 3 && emptyCount === 2) return -10;
    if (oCount === 2 && emptyCount === 3) return 1;
    if (xCount === 2 && emptyCount === 3) return -1;

    return 0;
  };

  const tryWinOrBlock = (board: string[][], symbol: string): boolean => {
    // Vérifier si on peut gagner ou bloquer
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (board[r][c] === "") {
          board[r][c] = symbol;
          if (checkWin(board, symbol)) {
            board[r][c] = "O";
            return true;
          }
          board[r][c] = "";
        }
      }
    }
    return false;
  };

  const checkWin = (board: string[][], symbol: string): boolean => {
    // Vérifier lignes, colonnes et diagonales (5 alignés)
    const n = 10;
    const winLength = 5;

    // Lignes
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - winLength; c++) {
        let count = 0;
        for (let i = 0; i < winLength; i++) {
          if (board[r][c + i] === symbol) count++;
          else break;
        }
        if (count === winLength) return true;
      }
    }

    // Colonnes
    for (let c = 0; c < n; c++) {
      for (let r = 0; r <= n - winLength; r++) {
        let count = 0;
        for (let i = 0; i < winLength; i++) {
          if (board[r + i][c] === symbol) count++;
          else break;
        }
        if (count === winLength) return true;
      }
    }

    // Diagonales
    for (let r = 0; r <= n - winLength; r++) {
      for (let c = 0; c <= n - winLength; c++) {
        let count = 0;
        for (let i = 0; i < winLength; i++) {
          if (board[r + i][c + i] === symbol) count++;
          else break;
        }
        if (count === winLength) return true;
      }
    }

    // Anti-diagonales
    for (let r = 0; r <= n - winLength; r++) {
      for (let c = winLength - 1; c < n; c++) {
        let count = 0;
        for (let i = 0; i < winLength; i++) {
          if (board[r + i][c - i] === symbol) count++;
          else break;
        }
        if (count === winLength) return true;
      }
    }
    return false;
  };

  const resetGame = () => {
    setBoard(Array.from({ length: 10 }, () => Array(10).fill("")));
    setPlayerTurn(true);
    setWinner(null);
  };

  const backToMenu = () => {
    setDifficulty(null);
    setBoard(Array.from({ length: 10 }, () => Array(10).fill("")));
    setPlayerTurn(true);
    setWinner(null);
  };

  const handleNewGame = () => {
    setBoard(Array.from({ length: 10 }, () => Array(10).fill("")));
    setWinner(null);
    setPlayerTurn(true);
    setShowVictoryScreen(false);
  };

  const handleChangeDifficulty = () => {
    setShowVictoryScreen(false);
    setDifficulty(null);
  };

  const shareWhatsApp = () => {
    const text = "🎮 J'ai battu le bot sur WinCashX ! Rejoins-moi pour gagner de l'argent réel en jouant au Tic-Tac-Toe ! 💰 https://wincashx.com";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareTelegram = () => {
    const text = "🎮 J'ai battu le bot sur WinCashX ! Rejoins-moi pour gagner de l'argent réel en jouant au Tic-Tac-Toe ! 💰 https://wincashx.com";
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://wincashx.com')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!difficulty) {
    return (
      <main className="min-h-screen bg-[#030303] text-white">
        <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden px-4 py-12">
          {/* Header */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/50 hover:text-white"
          >
            ← Retour
          </button>

          <h1 className="mb-2 text-center text-[21px] font-black tracking-tight">
            Mode Entraînement
          </h1>
          <p className="mb-4 text-center text-[11px] text-white/40">
            Choisissez votre niveau de difficulté
          </p>

          {/* Warning - No real money */}
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-yellow-400">
              ⚠️ Pas d'argent réel - Mode entraînement gratuit
            </p>
          </div>

          {/* Score */}
          <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center">
            <p className="text-[9px] text-white/30 mb-1">Score</p>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-[10px] text-white/40">Vous</p>
                <p className="text-[18px] font-black text-blue-400">{score.player}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40">Bot</p>
                <p className="text-[18px] font-black text-red-400">{score.bot}</p>
              </div>
            </div>
          </div>

          {/* Difficulties */}
          <div className="space-y-3">
            {(Object.keys(difficultySettings) as Difficulty[]).map((diff) => {
              const settings = difficultySettings[diff];
              const isImpossible = diff === "impossible";
              
              return (
                <motion.button
                  key={diff}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDifficulty(diff)}
                  className={`w-full rounded-2xl border-2 border-${settings.color}-500/40 bg-${settings.color}-500/10 px-6 py-4 text-left transition-all hover:border-${settings.color}-500/60 hover:bg-${settings.color}-500/20 relative overflow-hidden ${
                    isImpossible ? "animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]" : ""
                  }`}
                >
                  {isImpossible && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent animate-[shimmer_2s_infinite]" />
                  )}
                  
                  <div className="relative flex items-center gap-3">
                    <span className={`text-3xl ${isImpossible ? "animate-bounce" : ""}`}>{settings.emoji}</span>
                    <div>
                      <p className={`text-sm font-black text-white ${isImpossible ? "text-orange-400" : ""}`}>{settings.name}</p>
                      <p className="text-[9px] text-white/60">{settings.description}</p>
                    </div>
                    {isImpossible && (
                      <span className="ml-auto text-2xl animate-spin">🔥</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={backToMenu}
            className="flex items-center gap-2 text-white/50 hover:text-white"
          >
            ← Retour
          </button>
          <div className="text-[10px] text-white/40">
            {difficultySettings[difficulty].name}
          </div>
        </div>

        {/* Score */}
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-[9px] text-white/40">Vous</p>
              <p className="text-[14px] font-black text-blue-400">{score.player}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[9px] text-white/40">Bot</p>
              <p className="text-[14px] font-black text-red-400">{score.bot}</p>
            </div>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="mb-2 text-center">
          <p className="text-[11px] text-white/60">
            {winner
              ? winner === "X"
                ? "🎉 Vous avez gagné !"
                : "😢 Le bot a gagné !"
              : playerTurn
              ? "✨ Votre tour (X)"
              : "🤖 Tour du bot (O)"}
          </p>
        </div>

        {/* Warning - No real money */}
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center">
          <p className="text-[9px] font-bold text-yellow-400">
            ⚠️ Pas d'argent réel - Mode entraînement
          </p>
        </div>

        {/* Board */}
        <div className="mb-4 grid grid-cols-10 gap-0.5">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                disabled={(!playerTurn || cell !== "" || winner !== null) as boolean}
                className={`aspect-square rounded-sm border border-white/[0.08] bg-white/[0.02] text-xs Font-bold transition-all hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:hover:bg-white/[0.02] ${
                  cell === "X" ? "text-blue-400" : cell === "O" ? "text-red-400" : ""
                }`}
              >
                {cell}
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={resetGame}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold text-white/70 transition hover:bg-white/10 active:scale-95"
          >
            Nouvelle partie
          </button>
          <button
            onClick={backToMenu}
            className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-[11px] font-bold text-white/50 transition hover:bg-white/5 active:scale-95"
          >
            Changer de difficulté
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-[8px] text-white/30">
            🎮 Mode entraînement - Pas d'argent réel
          </p>
        </div>
      </div>

      {/* Victory Screen Overlay */}
      {showVictoryScreen && winner === "X" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="mx-4 max-w-sm rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-900/20 to-blue-900/20 p-6 text-center shadow-2xl"
          >
            {/* Trophy Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-4 text-6xl"
            >
              🏆
            </motion.div>

            {/* Congratulations Text */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2 text-2xl font-black text-green-400"
            >
              Félicitations !
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6 text-sm text-white/70"
            >
              Vous avez battu le bot en mode {difficultySettings[difficulty].name} !
            </motion.p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewGame}
                className="w-full rounded-xl bg-gradient-to-r from-green-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-green-500/25"
              >
                🎮 Nouvelle Partie
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleChangeDifficulty}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/20"
              >
                ⚡ Changer Niveau
              </motion.button>

              {/* Share Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-4"
              >
                <p className="mb-3 text-xs text-white/50">
                  Partagez votre victoire avec vos amis :
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareWhatsApp}
                    className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-500"
                  >
                    📱 WhatsApp
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareTelegram}
                    className="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-400"
                  >
                    ✈️ Telegram
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
