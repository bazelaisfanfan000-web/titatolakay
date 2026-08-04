"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useNotifications } from "@/hooks/useNotifications";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Initialiser les notifications
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

          {/* Single Block */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/[0.12] to-yellow-500/[0.08] p-4 backdrop-blur-xl sm:p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">🥳</span>
              <p className="text-xs font-black text-orange-300">
                BIENVENUE SUR WINCASH - LA PLATEFORME QUI TE FAIT GAGNER !
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-orange-500/20 bg-orange-500/[0.08] px-3 py-2">
              <p className="text-[10px] font-bold text-orange-200">
                Pour fêter notre MOIS DE LANCEMENT, on te réserve une CONDITION DE RETRAIT EXCEPTIONNELLE :
              </p>
              <p className="mt-1 text-sm font-black text-orange-300">
                🔥 ×1,5 SEULEMENT pour retirer tes gains !
              </p>
            </div>

            <div className="mb-4 space-y-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-[9px] font-bold text-white/50">
                Exemple concret :
              </p>
              <div className="space-y-1">
                <p className="text-[9px] text-white/70">
                  ✅ Tu déposes 100 HTG
                </p>
                <p className="text-[9px] text-white/70">
                  ✅ Tu gagnes 1 match
                </p>
                <p className="text-[9px] text-white/70">
                  ✅ Tu retires 150 HTG directement !
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.08] px-3 py-2">
              <p className="text-[9px] text-yellow-200/80">
                🕒 Offre valable du 03/07/2026 au 03/09/2026.
              </p>
              <p className="text-[9px] text-white/50">
                Après cette date, les conditions passeront à ×2, comme partout ailleurs.
              </p>
            </div>

            <div className="mb-4 text-center">
              <p className="text-[10px] font-black text-orange-300">
                NE MANQUE PAS CETTE OPPORTUNITÉ UNIQUE !
              </p>
              <p className="mt-1 text-[9px] text-white/60">
                👉 Inscris-toi maintenant et profite de cette offre de lancement !
              </p>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Prêt à jouer ?
              </h1>

              <p className="mt-2 text-xs leading-5 text-white/35">
                Crée ton compte ou connecte-toi pour rejoindre l'univers Wincash.
              </p>
            </div>

            {/* Register */}
            <motion.button
              whileTap={{ scale: 0.97, y: 4 }}
              onClick={() => router.push("/register")}
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                rounded-xl
                border
                border-blue-400/40
                bg-blue-500/20
                text-center
                backdrop-blur-md
                shadow-[0_5px_0_rgba(30,64,175,0.8),0_0_25px_rgba(37,99,235,0.12)]
                transition-all
                hover:border-blue-300/60
                hover:bg-blue-500/30
                hover:shadow-[0_6px_0_rgba(30,64,175,0.8),0_0_30px_rgba(37,99,235,0.2)]
                active:translate-y-[4px]
                active:shadow-none
              "
            >
              <div className="text-center">
                <p className="text-xs font-black text-blue-100">
                  🚀 Créer un compte
                </p>

                <p className="text-[9px] text-blue-100/50">
                  Commencer à jouer
                </p>
              </div>
            </motion.button>

            {/* Login */}
            <motion.button
              whileTap={{ scale: 0.97, y: 4 }}
              onClick={() => router.push("/login")}
              className="
                mt-3
                flex
                h-12
                w-full
                items-center
                justify-center
                rounded-xl
                border
                border-blue-400/25
                bg-blue-500/[0.08]
                text-center
                backdrop-blur-md
                shadow-[0_5px_0_rgba(23,52,130,0.65),0_0_20px_rgba(37,99,235,0.06)]
                transition-all
                hover:border-blue-300/40
                hover:bg-blue-500/[0.15]
                hover:shadow-[0_6px_0_rgba(23,52,130,0.7),0_0_25px_rgba(37,99,235,0.12)]
                active:translate-y-[4px]
                active:shadow-none
              "
            >
              <div className="text-center">
                <p className="text-xs font-black text-white/90">
                  🔐 Se connecter
                </p>

                <p className="text-[9px] text-white/30">
                  Accéder à ton compte
                </p>
              </div>
            </motion.button>

            <div className="mt-6 text-center">
              <p className="text-[10px] font-black text-white/80">
                🚀💎 WINCASH - LÀ OÙ TES GAINS PRENNENT LEUR VRAIE VALEUR !
              </p>
              <p className="mt-2 text-[9px] text-white/50">
                💳 Déposer et retirer par Moncash en toute sécurité
              </p>
            </div>

          </motion.div>


        </motion.section>
      </div>
    </main>
  );
}