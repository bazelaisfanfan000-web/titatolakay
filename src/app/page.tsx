"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useNotifications } from "@/hooks/useNotifications";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";
import { Wallet, Users, TrendingUp, BarChart3 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useNotifications();
  useForegroundNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/public/total-balance");
        if (response.ok) {
          const data = await response.json();
          setTotalBalance(data.totalBalance || 0);
          setTotalUsers(data.totalUsers || 0);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des statistiques:", err);
      } finally {
        setLoadingStats(false);
      }
    }

    if (mounted) {
      fetchStats();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </main>
    );
  }

  const stats = [
    { 
      label: "Joueurs en ligne", 
      value: loadingStats ? "..." : totalUsers?.toLocaleString("fr-HT") || "0", 
      icon: <Users className="w-5 h-5 text-cyan-400" />,
      real: true
    },
    { label: "Parties", value: "18 432", icon: "🎮", real: false },
    { 
      label: "Solde total", 
      value: loadingStats ? "..." : `${(totalBalance || 0).toLocaleString("fr-HT")} HTG`, 
      icon: <Wallet className="w-5 h-5 text-cyan-400" />,
      real: true
    },
  ];

  const features = [
    { icon: "🎯", title: "Jouez contre des joueurs réels" },
    { icon: "💎", title: "Gagnez de l'argent réel" },
    { icon: "⚡", title: "Transactions instantanées" },
    { icon: "🛡️", title: "Sécurisé & Fiable" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-['Arial',sans-serif]">

      {/* ==========================================
          GRILLE DE FOND (effet cyberpunk)
      ========================================== */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ==========================================
          GLOWS NÉON
      ========================================== */}

      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[-150px] right-[-100px] h-[400px] w-[400px] rounded-full bg-magenta-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-[30%] left-[-150px] h-[300px] w-[300px] rounded-full bg-purple-500/8 blur-[100px]" />

      {/* ==========================================
          CONTENU
      ========================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative rounded-3xl border border-cyan-400/20 bg-black/60 backdrop-blur-2xl p-6 shadow-[0_0_80px_rgba(0,255,255,0.05)] sm:p-8"
          >

            {/* ==========================================
                LOGO XO NÉON
            ========================================== */}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-5 text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-black/60 shadow-[0_0_40px_rgba(0,255,255,0.15)]">
                    <span className="text-3xl font-black tracking-tighter">
                      <span className="text-red-400 drop-shadow-[0_0_12px_rgba(255,0,0,0.5)]">X</span>
                      <span className="text-cyan-400 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">O</span>
                    </span>
                  </div>
                </div>
                <h1 className="text-4xl font-black tracking-tight">
                  Win
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                    Cash
                  </span>
                </h1>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)] animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-300">En ligne</span>
                <span className="text-[7px] text-white/20">•</span>
                <span className="text-[7px] text-white/30">100% légal</span>
              </motion.div>
            </motion.div>

            {/* ==========================================
                SLOGAN
            ========================================== */}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-5 text-center text-[14px] text-white/50 leading-relaxed"
            >
              Jouez au <span className="text-white font-bold">Tic-Tac-Toe</span>
              <span className="block text-lg font-black text-transparent bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text drop-shadow-[0_0_30px_rgba(255,200,0,0.15)]">
                gagnez de l'argent réel
              </span>
            </motion.p>

            {/* ==========================================
                STATISTIQUES
            ========================================== */}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-5 grid grid-cols-3 gap-2"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.08, duration: 0.4 }}
                  className="rounded-xl border border-cyan-400/10 bg-black/40 p-2.5 text-center backdrop-blur-sm"
                >
                  {typeof stat.icon === 'string' ? (
                    <span className="text-lg">{stat.icon}</span>
                  ) : (
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                  )}
                  <p className="text-[12px] font-black text-cyan-300">{stat.value}</p>
                  <p className="text-[6px] text-white/30 uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* ==========================================
                GRAPHIQUE DU SOLDE
            ========================================== */}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mb-5 rounded-xl border border-cyan-400/10 bg-black/40 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Évolution du solde</span>
                </div>
                <span className="text-[8px] text-cyan-400/60">7 derniers jours</span>
              </div>
              <div className="flex items-end justify-between gap-1 h-16">
                {[30, 45, 35, 60, 50, 75, totalBalance ? Math.min(100, (totalBalance / 10000) * 100) : 50].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.8 + index * 0.05, duration: 0.4 }}
                    className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/20 to-cyan-400/40 hover:from-cyan-500/30 hover:to-cyan-400/60 transition-all cursor-pointer"
                  />
                ))}
              </div>
            </motion.div>

            {/* ==========================================
                FEATURES (2×2)
            ========================================== */}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mb-5 grid grid-cols-2 gap-2"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.06, duration: 0.4 }}
                  className="group rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:shadow-[0_0_30px_rgba(0,255,255,0.05)]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </span>
                    <p className="text-[10px] font-bold text-white/80 leading-tight">
                      {feature.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* ==========================================
                BOUTONS
            ========================================== */}

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/register")}
                className="
                  group
                  relative
                  w-full
                  overflow-hidden
                  rounded-xl
                  border
                  border-cyan-400/30
                  bg-gradient-to-r
                  from-cyan-600/30
                  via-cyan-500/20
                  to-purple-600/30
                  px-6
                  py-3.5
                  text-center
                  shadow-[0_0_40px_rgba(0,255,255,0.08)]
                  transition-all
                  hover:shadow-[0_0_60px_rgba(0,255,255,0.15)]
                  hover:border-cyan-400/50
                  active:scale-[0.98]
                "
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-lg">🚀</span>
                  <div>
                    <p className="text-sm font-black text-white">Commencer</p>
                    <p className="text-[9px] text-cyan-300/60">Gratuit • 2 minutes</p>
                  </div>
                  <span className="text-cyan-300/50 group-hover:translate-x-1 transition-transform">›</span>
                </div>
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
                  py-2.5
                  text-center
                  transition-all
                  hover:border-cyan-400/20
                  hover:bg-cyan-400/5
                  active:scale-[0.98]
                "
              >
                <p className="text-sm text-white/40">
                  J'ai déjà un compte <span className="text-cyan-400/60">→</span>
                </p>
              </motion.button>
            </div>

            {/* ==========================================
                BADGES DE CONFIANCE
            ========================================== */}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-5 flex items-center justify-center gap-4"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🔒</span>
                <span className="text-[7px] text-white/25">Sécurisé</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">💳</span>
                <span className="text-[7px] text-white/25">MonCash</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🛡️</span>
                <span className="text-[7px] text-white/25">18+ 🔞</span>
              </div>
            </motion.div>

            {/* ==========================================
                LIEN RÈGLES
            ========================================== */}

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/rules")}
                className="text-[8px] text-white/15 hover:text-cyan-400/40 transition"
              >
                📋 Règles du jeu
              </button>
            </div>

          </motion.div>

        </motion.section>
      </div>

      {/* ==========================================
          BADGE PROMO NÉON
      ========================================== */}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
        className="fixed top-4 right-4 z-50"
      >
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-black/80 px-3 py-1.5 shadow-[0_0_30px_rgba(245,158,11,0.1)] backdrop-blur-sm">
          <span className="text-[8px] font-black text-amber-400 animate-pulse">🔥</span>
          <span className="text-[7px] font-bold text-amber-300/80">-50% frais</span>
        </div>
      </motion.div>

    </main>
  );
}