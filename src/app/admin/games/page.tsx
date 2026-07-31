"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Gamepad2, Trophy, Coins, Users } from "lucide-react";

export default function AdminGamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    const gamesRef = ref(database, "rooms");

    const unsubscribe = onValue(
      gamesRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const list = Object.entries(data).map(([id, game]: any) => ({
          id,
          bet: Number(game.bet || 0),
          status: game.game?.status || game.status || "waiting",
          winner: game.game?.winner || null,
          players: Object.values(game.players || {})
        }));

        setGames(list);
      }
    );

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "playing":
        return "text-yellow-400";
      case "finished":
        return "text-green-400";
      default:
        return "text-blue-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "playing":
        return "En cours";
      case "finished":
        return "Terminée";
      default:
        return "En attente";
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      {/* Décorations */}
      <div className="pointer-events-none fixed -left-24 top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-24 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

      {/* Conteneur mobile */}
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden pb-28">
        {/* Header fixe */}
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-[#020617]/95 backdrop-blur-2xl">
          <div className="mx-auto flex h-[64px] w-full max-w-[430px] items-center justify-between px-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/70 transition hover:bg-white/[0.05]"
            >
              ←
            </button>

            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-[17px] font-black leading-none tracking-tight text-white">
                🎮 Parties
              </h1>
              <p className="mt-1 text-[8px] font-medium leading-none text-white/35">
                Gestion des parties
              </p>
            </div>

            <div className="w-10" />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 pb-10 pt-[88px]">
          {/* Liste des parties */}
          <div className="space-y-3">
            {games.map((game) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-400/[0.07] text-lg">
                      <Gamepad2 />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-white">
                        Partie #{game.id.slice(0, 8)}
                      </p>
                      <p className={`mt-1 text-[9px] ${getStatusColor(game.status)}`}>
                        {getStatusLabel(game.status)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] text-white/40">Mise</p>
                    <p className="text-[13px] font-black text-yellow-300">
                      {game.bet} HTG
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <p className="text-[9px] text-white/40">Joueurs</p>
                    <p className="mt-1 text-[11px] font-black text-blue-300">
                      {game.players.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <p className="text-[9px] text-white/40">Pot</p>
                    <p className="mt-1 text-[11px] font-black text-cyan-300">
                      {game.bet * game.players.length} HTG
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <p className="text-[9px] text-white/40">Gagnant</p>
                    <p className="mt-1 text-[11px] font-black text-green-400">
                      {game.winner || "—"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-4">🎮</p>
              <p className="text-white/50">Aucune partie en cours</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}