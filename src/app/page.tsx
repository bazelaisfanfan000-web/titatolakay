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
      <main className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
      </main>
    );
  }

  // ==========================================
  // NOUVELLES STATISTIQUES - COMPLÈTEMENT DIFFÉRENTES
  // ==========================================
  const stats = [
    { label: "Niveaux", value: "156", icon: "📈" },
    { label: "Succès", value: "342", icon: "⭐" },
    { label: "Temps", value: "2.3k h", icon: "⏱️" },
  ];

  // ==========================================
  // NOUVELLES FEATURES
  // ==========================================
  const features = [
    { icon: "🚀", title: "Progression rapide" },
    { icon: "🏅", title: "Classement mondial" },
    { icon: "🎨", title: "Personnalisation" },
    { icon: "📊", title: "Statistiques avancées" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a12]">

      {/* ==========================================
          FOND - UN SEUL HALO BLEU
      ========================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[#0a0a12]" />
      <div className="pointer-events-none absolute bottom-[-300px] left-[-200px] h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[150px]" />

      {/* ==========================================
          CONTENU PRINCIPAL
      ========================================== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >

          {/* ==========================================
              CARTE LIQUID GLASS - NOUVELLE FORME
          ========================================== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative rounded-[48px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
          >

            {/* ==========================================
                LOGO - NOUVEAU
            ========================================== */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 text-center"
            >
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-2xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-blue-500/40 bg-black/60 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                    <span className="text-3xl font-black tracking-tighter text-blue-500">W</span>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Win<span className="text-blue-500">Cash</span>
                  </h1>
                  <p className="text-[10px] text-white/30 font-medium tracking-widest">PLATEFORME DE JEUX</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-green-400">Disponible</span>
                <span className="text-[7px] text-white/20">•</span>
                <span className="text-[7px] text-white/30">Beta</span>
              </motion.div>
            </motion.div>

            {/* ==========================================
                SLOGAN - NOUVEAU
            ========================================== */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-6 text-center text-[14px] text-white/50 leading-relaxed"
            >
              <span className="text-white font-bold">Découvrez</span> une nouvelle façon de jouer
              <span className="block text-lg font-black text-white">
                et de gagner
              </span>
            </motion.p>

            {/* ==========================================
                STATISTIQUES - COMPLÈTEMENT NOUVELLES
            ========================================== */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-6 grid grid-cols-3 gap-2"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.08, duration: 0.4 }}
                  className="rounded-xl border border-blue-500/10 bg-black/40 p-2.5 text-center backdrop-blur-sm"
                >
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-[12px] font-black text-blue-400">{stat.value}</p>
                  <p className="text-[6px] text-white/30 uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* ==========================================
                FEATURES - NOUVELLES
            ========================================== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mb-6 grid grid-cols-2 gap-2"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.06, duration: 0.4 }}
                  className="group rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-blue-500/30 hover:bg-blue-500/5"
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
                BOUTONS PRINCIPAUX
            ========================================== */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(59,130,246,0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/create-room")}
                className="
                  group
                  relative
                  w-full
                  rounded-2xl
                  border-2
                  border-blue-500/40
                  bg-blue-500/10
                  px-6
                  py-4
                  text-center
                  transition-all
                  duration-200
                  backdrop-blur-sm
                  shadow-[0_8px_0_rgba(59,130,246,0.15),0_4px_20px_rgba(59,130,246,0.05)]
                  hover:shadow-[0_6px_0_rgba(59,130,246,0.2),0_12px_40px_rgba(59,130,246,0.15)]
                  hover:border-blue-500/60
                  hover:bg-blue-500/20
                  hover:translate-y-[-3px]
                  active:shadow-[0_2px_0_rgba(59,130,246,0.1),0_4px_20px_rgba(59,130,246,0.05)]
                  active:translate-y-[6px]
                "
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl" />

                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-lg">🎮</span>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Créer une partie</p>
                    <p className="text-[9px] text-blue-400/60">Lancez votre propre défi</p>
                  </div>
                  <span className="text-blue-400/50 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(34,197,94,0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/join-room")}
                className="
                  group
                  relative
                  w-full
                  rounded-2xl
                  border-2
                  border-green-500/40
                  bg-green-500/10
                  px-6
                  py-4
                  text-center
                  transition-all
                  duration-200
                  backdrop-blur-sm
                  shadow-[0_8px_0_rgba(34,197,94,0.15),0_4px_20px_rgba(34,197,94,0.05)]
                  hover:shadow-[0_6px_0_rgba(34,197,94,0.2),0_12px_40px_rgba(34,197,94,0.15)]
                  hover:border-green-500/60
                  hover:bg-green-500/20
                  hover:translate-y-[-3px]
                  active:shadow-[0_2px_0_rgba(34,197,94,0.1),0_4px_20px_rgba(34,197,94,0.05)]
                  active:translate-y-[6px]
                "
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl" />

                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-lg">🚀</span>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Rejoindre une partie</p>
                    <p className="text-[9px] text-green-400/60">Trouvez une partie disponible</p>
                  </div>
                  <span className="text-green-400/50 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(168,85,247,0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/game")}
                className="
                  group
                  relative
                  w-full
                  rounded-2xl
                  border-2
                  border-purple-500/40
                  bg-purple-500/10
                  px-6
                  py-4
                  text-center
                  transition-all
                  duration-200
                  backdrop-blur-sm
                  shadow-[0_8px_0_rgba(168,85,247,0.15),0_4px_20px_rgba(168,85,247,0.05)]
                  hover:shadow-[0_6px_0_rgba(168,85,247,0.2),0_12px_40px_rgba(168,85,247,0.15)]
                  hover:border-purple-500/60
                  hover:bg-purple-500/20
                  hover:translate-y-[-3px]
                  active:shadow-[0_2px_0_rgba(168,85,247,0.1),0_4px_20px_rgba(168,85,247,0.05)]
                  active:translate-y-[6px]
                "
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl" />

                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-lg">🎯</span>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Mode Entraînement</p>
                    <p className="text-[9px] text-purple-400/60">Jouez contre le bot, 3 niveaux disponibles</p>
                  </div>
                  <span className="text-purple-400/50 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(234,179,8,0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/referral")}
                className="
                  group
                  relative
                  w-full
                  rounded-2xl
                  border-2
                  border-yellow-500/40
                  bg-yellow-500/10
                  px-6
                  py-4
                  text-center
                  transition-all
                  duration-200
                  backdrop-blur-sm
                  shadow-[0_8px_0_rgba(234,179,8,0.15),0_4px_20px_rgba(234,179,8,0.05)]
                  hover:shadow-[0_6px_0_rgba(234,179,8,0.2),0_12px_40px_rgba(234,179,8,0.15)]
                  hover:border-yellow-500/60
                  hover:bg-yellow-500/20
                  hover:translate-y-[-3px]
                  active:shadow-[0_2px_0_rgba(234,179,8,0.1),0_4px_20px_rgba(234,179,8,0.05)]
                  active:translate-y-[6px]
                "
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl" />

                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-lg">🎁</span>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Inviter et gagner de l'argent</p>
                    <p className="text-[9px] text-yellow-400/60">Invitez vos amis et gagnez 5% de leurs pertes</p>
                  </div>
                  <span className="text-yellow-400/50 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </motion.button>
            </div>

            {/* ==========================================
                BADGES - DIFFÉRENTS
            ========================================== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6 flex items-center justify-center gap-4"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🔐</span>
                <span className="text-[7px] text-white/25">Sécurisé</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">💳</span>
                <span className="text-[7px] text-white/25">Paiements</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🎯</span>
                <span className="text-[7px] text-white/25">Objectifs</span>
              </div>
            </motion.div>

            {/* ==========================================
                LIEN BAS - NOUVEAU
            ========================================== */}
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/rules")}
                className="text-[8px] text-white/20 hover:text-blue-400/60 transition"
              >
                📖 En savoir plus
              </button>
            </div>

          </motion.div>

          {/* ==========================================
              PETIT DÉTAIL EN BAS
          ========================================== */}
          <div className="mx-auto mt-4 h-2 w-2 rounded-full bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]" />

        </motion.section>
      </div>

      {/* ==========================================
          BADGE PROMO - NOUVEAU
      ========================================== */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
        className="fixed top-4 right-4 z-50"
      >
        <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-black/80 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-[8px] font-black text-blue-400 animate-pulse">✨</span>
          <span className="text-[7px] font-bold text-blue-400/80">Nouveauté</span>
        </div>
      </motion.div>

    </main>
  );
}