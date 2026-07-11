"use client";

import { useEffect, useState } from "react";

type Props = {
  winner: string;
  mySymbol: string;
  reward: number;
  onClose: () => void;
  onRequestRematch?: () => void;
};

export default function WinnerModal({
  winner,
  mySymbol,
  reward,
  onClose,
  onRequestRematch
}: Props) {
  const victory = winner === mySymbol;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    
    const audio = new Audio(
      victory
        ? "/sounds/win.mp3"
        : "/sounds/lose.mp3"
    );

    audio.volume = 0.7;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
    };
  }, [victory]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div
        className={`
          rounded-3xl p-8 text-center w-80 shadow-2xl
          transform transition-all duration-500
          ${victory ? "bg-gradient-to-br from-green-600 to-green-800" : "bg-gradient-to-br from-red-600 to-red-800"}
          ${showConfetti ? "scale-100 opacity-100" : "scale-90 opacity-0"}
        `}
      >
        {victory ? (
          <>
            <div className="text-6xl animate-bounce mb-4">
              🎉🎉🎉
            </div>

            <h1 className="text-3xl font-black mt-3 animate-pulse">
              🏆 VICTOIRE !
            </h1>

            <p className="mt-4 text-xl">
              Tu as aligné 4 symboles
            </p>

            <div className="mt-4 bg-white/20 rounded-xl p-4">
              <p className="text-lg">🎁 Tu as gagné</p>
              <p className="text-4xl font-black animate-pulse">
                +{reward} HTG
              </p>
            </div>

            <div className="mt-4 text-3xl animate-pulse">
              ✨✨✨
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl animate-pulse mb-4">
              ❌
            </div>

            <h1 className="text-3xl font-black mt-3">
              DÉFAITE
            </h1>

            <p className="mt-4 text-xl">
              L'adversaire a aligné 4 symboles
            </p>

            <div className="mt-4 bg-white/20 rounded-xl p-4">
              <p className="text-lg">💰 Mise perdue</p>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="bg-white text-black font-bold rounded-xl px-6 py-3 mt-6 hover:bg-gray-100 transition-all"
        >
          Retour accueil
        </button>

        {onRequestRematch && (
          <button
            onClick={onRequestRematch}
            className="w-full bg-purple-500 text-white font-bold rounded-xl px-6 py-3 mt-3 hover:bg-purple-600 transition-all"
          >
            🔄 Demander revanche
          </button>
        )}
      </div>
    </div>
  );
}
