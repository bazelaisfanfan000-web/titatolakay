"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Search, Ban, CheckCircle, Wallet, Trophy, Gamepad2 } from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const usersRef = ref(database, "users");

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const list = Object.entries(data).map(([uid, user]: any) => ({
          uid,
          username: user.username || "Joueur",
          email: user.email || "",
          balance: Number(user.balance || 0),
          wins: Number(user.wins || 0),
          loses: Number(user.loses || 0),
          games: Number(user.gamesPlayed || 0),
          blocked: user.blocked || false,
        }));

        setPlayers(list);
      }
    );

    return () => unsubscribe();
  }, []);

  async function toggleBlock(player: any) {
    await update(
      ref(database, `users/${player.uid}`),
      {
        blocked: !player.blocked,
      }
    );
  }

  const filtered = players.filter(
    (player) =>
      player.username.toLowerCase().includes(search.toLowerCase()) ||
      player.email.toLowerCase().includes(search.toLowerCase())
  );

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
                👥 Utilisateurs
              </h1>
              <p className="mt-1 text-[8px] font-medium leading-none text-white/35">
                Gestion des joueurs
              </p>
            </div>

            <div className="w-10" />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 pb-10 pt-[88px]">
          {/* Recherche */}
          <div className="relative mb-4">
            <Search
              className="absolute left-4 top-3 text-gray-400"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-blue-400/30"
            />
          </div>

          {/* Liste des joueurs */}
          <div className="space-y-3">
            {filtered.map((player) => (
              <motion.div
                key={player.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                className={`rounded-xl border p-3 ${
                  player.blocked
                    ? "border-red-400/30 bg-red-500/[0.05]"
                    : "border-white/[0.08] bg-white/[0.025]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-white">
                      {player.username}
                    </p>
                    <p className="mt-1 truncate text-[9px] text-white/40">
                      {player.email}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleBlock(player)}
                    className={`ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      player.blocked
                        ? "border-green-400/30 bg-green-500/[0.10] text-green-400"
                        : "border-red-400/30 bg-red-500/[0.10] text-red-400"
                    }`}
                  >
                    {player.blocked ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Ban size={20} />
                    )}
                  </button>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <Wallet size={18} />
                    <p className="text-[9px] text-white/40">Solde</p>
                    <p className="mt-1 text-[11px] font-black text-blue-300">
                      {player.balance} HTG
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <Trophy size={18} />
                    <p className="text-[9px] text-white/40">Victoires</p>
                    <p className="mt-1 text-[11px] font-black text-green-400">
                      {player.wins}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <Gamepad2 size={18} />
                    <p className="text-[9px] text-white/40">Parties</p>
                    <p className="mt-1 text-[11px] font-black text-purple-400">
                      {player.games}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2 text-center">
                    <p className="text-[9px] text-white/40">Défaites</p>
                    <p className="mt-1 text-[11px] font-black text-red-400">
                      {player.loses}
                    </p>
                  </div>
                </div>

                {player.blocked && (
                  <p className="mt-2 text-center text-[9px] font-bold text-red-400">
                    🚫 Compte bloqué
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-4">👥</p>
              <p className="text-white/50">Aucun joueur trouvé</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}