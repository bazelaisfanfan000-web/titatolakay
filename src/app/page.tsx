"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useNotifications } from "@/hooks/useNotifications";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useNotifications();
  useForegroundNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#05070b] flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">

      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-180px] right-[-120px] h-[360px] w-[360px] rounded-full bg-blue-500/[0.07] blur-[130px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[460px]"
        >

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-8"
          >

            {/* ==========================================
                LOGO
            ========================================== */}

            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black tracking-tight">
                Win<span className="text-blue-400">Cash</span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                Jeu de stratégie • Gagnez de l'argent réel
              </p>
            </div>

            {/* ==========================================
                FEATURES
            ========================================== */}

            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition hover:border-blue-500/20 hover:bg-blue-500/[0.03]">
                <span className="text-xl">🎮</span>
                <div>
                  <p className="text-sm font-medium text-white">Jouez contre des joueurs réels</p>
                  <p className="text-[10px] text-white/40">Tic-Tac-Toe sur grille 10×10</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition hover:border-blue-500/20 hover:bg-blue-500/[0.03]">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-sm font-medium text-white">Gagnez de l'argent réel</p>
                  <p className="text-[10px] text-white/40">Doublez votre mise en gagnant</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition hover:border-blue-500/20 hover:bg-blue-500/[0.03]">
                <span className="text-xl">💳</span>
                <div>
                  <p className="text-sm font-medium text-white">Dépôts & Retraits par MonCash</p>
                  <p className="text-[10px] text-white/40">Transactions sécurisées</p>
                </div>
              </div>
            </div>

            {/* ==========================================
                BOUTONS
            ========================================== */}

            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/register")}
                className="
                  group
                  relative
                  w-full
                  rounded-xl
                  border
                  border-blue-400/30
                  bg-blue-500/[0.06]
                  px-6
                  py-3.5
                  text-center
                  backdrop-blur-sm
                  transition-all
                  hover:border-blue-400/60
                  hover:bg-blue-500/[0.12]
                  hover:shadow-[0_8px_25px_rgba(59,130,246,0.10)]
                  active:scale-[0.98]
                "
              >
                <p className="text-sm font-bold text-white">Créer un compte</p>
                <p className="text-[10px] text-blue-300/50">Commencez à jouer</p>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/login")}
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-transparent
                  px-6
                  py-3
                  text-center
                  transition-all
                  hover:border-blue-400/20
                  hover:bg-blue-500/[0.04]
                  active:scale-[0.98]
                "
              >
                <p className="text-sm text-white/50">Se connecter</p>
              </motion.button>
            </div>

            {/* ==========================================
                LIEN RÈGLES
            ========================================== */}

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/rules")}
                className="text-[10px] text-white/20 hover:text-blue-400/50 transition"
              >
                📋 Voir les règles du jeu
              </button>
            </div>

            {/* ==========================================
                FOOTER
            ========================================== */}

            <div className="mt-6 border-t border-white/[0.04] pt-4 text-center">
              <p className="text-[9px] text-white/20">
                Dépôt/Retrait par MonCash • 18+ 🔞
              </p>
            </div>

          </motion.div>

        </motion.section>
      </div>
    </main>
  );
}