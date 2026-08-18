"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Difficulty = "easy" | "medium" | "hard";

export default function TrainingPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [board, setBoard] = useState<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill(""))
  );
  const [playerTurn, setPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState({ player: 0, bot: 0 });

  const difficultySettings = {
    easy: { name: "Facile", color: "green", description: "Bot aléatoire" },
    medium: { name: "Moyen", color: "yellow", description: "Bot stratégique" },
    hard: { name: "Difficile", color: "red", description: "Bot expert" },
  };

  const handleCellClick = (row: number, col: number) => {
    if (!playerTurn || board[row][col] !== "" || winner) return;

    const newBoard = [...board.map(row => [...row])];
    newBoard[row][col] = "X";
    setBoard(newBoard);
    setPlayerTurn(false);

    // Vérifier victoire
    if (checkWin(newBoard, "X")) {
      setWinner("X");
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
      return;
    }

    // Tour du bot après délai
    setTimeout(() => botMove(newBoard), 500);
  };

  const botMove = (currentBoard: string[][]) => {
    if (winner) return;

    let newBoard = [...currentBoard.map(row => [...row])];
    let moveMade = false;

    // Stratégie selon difficulté
    if (difficulty === "easy") {
      // Mouvement aléatoire
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
    } else if (difficulty === "medium") {
      // Essayer de gagner ou bloquer
      moveMade = tryWinOrBlock(newBoard, "O") || tryWinOrBlock(newBoard, "X");
      if (!moveMade) {
        // Sinon aléatoire
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
    } else {
      // Hard - Minimax simplifié
      moveMade = tryWinOrBlock(newBoard, "O") || tryWinOrBlock(newBoard, "X");
      if (!moveMade) {
        // Centre si disponible
        if (newBoard[5][5] === "") {
          newBoard[5][5] = "O";
          moveMade = true;
        }
      }
      if (!moveMade) {
        // Coin
        const corners = [[0, 0], [0, 9], [9, 0], [9, 9]];
        for (const [r, c] of corners) {
          if (newBoard[r][c] === "") {
            newBoard[r][c] = "O";
            moveMade = true;
            break;
          }
        }
      }
      if (!moveMade) {
        // Aléatoire
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

    setBoard(newBoard);
    setPlayerTurn(true);

    if (checkWin(newBoard, "O")) {
      setWinner("O");
      setScore(prev => ({ ...prev, bot: prev.bot + 1 }));
    }
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
          <p className="mb-8 text-center text-[11px] text-white/40">
            Choisissez votre niveau de difficulté
          </p>

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
              return (
                <motion.button
                  key={diff}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDifficulty(diff)}
                  className={`w-full rounded-2xl border-2 border-${settings.color}-500/40 bg-${settings.color}-500/10 px-6 py-4 text-left transition-all hover:border-${settings.color}-500/60 hover:bg-${settings.color}-500/20`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {diff === "easy" ? "🟢" : diff === "medium" ? "🟡" : "🔴"}
                    </span>
                    <div>
                      <p className="text-sm font-black text-white">{settings.name}</p>
                      <p className="text-[9px] text-white/60">{settings.description}</p>
                    </div>
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
        <div className="mb-4 text-center">
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

        {/* Board */}
        <div className="mb-4 grid grid-cols-10 gap-0.5">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                disabled={!playerTurn || cell !== "" || winner}
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
    </main>
  );
}
