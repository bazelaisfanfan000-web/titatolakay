"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trophy, Zap, Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

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

          {/* Header */}
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <Image
                  src="/titato-logo.svg"
                  alt="TiTaTo"
                  width={30}
                  height={30}
                  priority
                />
              </div>

              <div>
                <p className="text-sm font-black tracking-[0.18em]">
                  TI TA TO
                </p>

                <p className="text-[9px] text-white/30">
                  Jeu • Stratégie • Victoire
                </p>
              </div>
            </div>

            <span className="rounded-full border border-blue-400/10 bg-blue-500/[0.07] px-2.5 py-1.5 text-[9px] font-bold text-blue-300">
              ● BETA
            </span>
          </div>


          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/[0.08] bg-[#0a0d13]/90 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6"
          >

            <div className="mb-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                Bienvenue 👋
              </p>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Prêt à jouer ?
              </h1>

              <p className="mt-2 text-xs leading-5 text-white/35">
                Crée ton compte ou connecte-toi pour rejoindre l'univers TiTaTo.
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


            {/* Features */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />

              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
                Pourquoi TiTaTo ?
              </span>

              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>


            <div className="grid grid-cols-3 gap-2">

              <Feature
                icon={<Zap size={16} />}
                title="Rapide"
                text="En temps réel"
              />

              <Feature
                icon={<Trophy size={16} />}
                title="Défis"
                text="Avec tes amis"
              />

              <Feature
                icon={<Gamepad2 size={16} />}
                title="Jeu"
                text="Joue et gagne"
              />

            </div>

          </motion.div>


          {/* Bottom Message */}
          <div className="mt-4 rounded-2xl border border-white/[0.05] bg-white/[0.018] px-4 py-3 text-center">

            <p className="text-[10px] font-bold text-blue-400/80">
              🎮 Joue avec tes amis en temps réel
            </p>

            <p className="mt-1 text-[9px] text-white/25">
              💬 Discute pendant tes parties
            </p>

          </div>


          <p className="mt-5 text-center text-[8px] text-white/15">
            TiTaTo • Version Beta
          </p>

        </motion.section>
      </div>
    </main>
  );
}


function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="flex min-h-[78px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-2 py-3 text-center transition hover:bg-blue-500/[0.035]"
    >

      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/[0.08] text-blue-400">
        {icon}
      </div>

      <span className="text-[9px] font-black text-white/65">
        {title}
      </span>

      <span className="mt-0.5 text-[7px] text-white/20">
        {text}
      </span>

    </motion.div>
  );
}