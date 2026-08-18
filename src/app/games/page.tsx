"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import { auth } from "@/lib/firebase";
import { Shield, Flame, Crown, Award } from "lucide-react";

interface Game {
  id: string;
  name: string;
  emoji: string;
  description: string;
  features: string[];
  avgTime: string;
  popularity: number;
}

const games: Game[] = [
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    emoji: "⚔️",
    description: "Alignez 5 symboles pour remporter le duel",
    features: ["Stratégie", "Réflexion"],
    avgTime: "3-5 min",
    popularity: 92,
  },
];

export default function GamesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const name = searchParams.get("name") || "";
  const bet = searchParams.get("bet") || "10";

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
    setError("");
  };

  const handleContinue = async () => {
    if (!selectedGame) return;

    try {
      setError("");
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      if (!bet || Number(bet) < 10) {
        setError("La mise minimum est de 10 HTG.");
        return;
      }

      if (Number(bet) > 10000) {
        setError("La mise maximum est de 10 000 HTG.");
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() ? name.trim() : "Partie Wincash",
          bet: Number(bet),
          mode: "1v1",
          gameType: "titato",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer la partie.");
      }

      router.push(`/room/${data.roomId}`);

    } catch (err: any) {
      console.error("Erreur création partie :", err);
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white px-4 py-6">
      <div className="mx-auto max-w-[430px]">
        <BackButton />

        <div className="mt-8 mb-8">
          <h1 className="text-center text-2xl font-bold text-white">
            Choisissez votre jeu
          </h1>
          <p className="mt-2 text-center text-sm text-white/60">
            Sélectionnez un jeu pour le duel
          </p>
        </div>

        <div className="space-y-4">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selectedGame === game.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-3xl">
                  {game.emoji}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{game.name}</h3>
                  <p className="mt-1 text-sm text-white/60">{game.description}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {game.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                      >
                        {feature}
                      </span>
                    ))}
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/40">
                      ⏱️ {game.avgTime}
                    </span>
                  </div>
                </div>

                {selectedGame === game.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: selectedGame === game.id ? `${game.popularity}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-white/40">{game.popularity}%</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/40">D'autres jeux seront disponibles plus tard</p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {selectedGame && (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 font-bold text-white transition-all hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? (
              "Création en cours..."
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4" />
                Lancer le duel
                <Flame className="h-4 w-4" />
              </span>
            )}
          </button>
        )}

        <div className="mt-6 rounded-lg border border-blue-500/10 bg-blue-500/5 px-4 py-3 text-center">
          <p className="text-xs font-medium text-blue-400 flex items-center justify-center gap-1">
            <Award className="h-3 w-3" />
            Partagez WinCashX à vos amis, ça ne coûte rien !
            <Crown className="h-3 w-3 text-yellow-400" />
          </p>
        </div>
      </div>
    </main>
  );
}