"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function JoinGameButton() {

  const router = useRouter();

  return (
    <motion.button
      onClick={() => router.push("/join-game")}
      whileHover={{
        scale: 1.05,
        rotateX: 5,
        rotateY: -5
      }}
      whileTap={{
        scale: 0.95
      }}
      style={{
        transformStyle: "preserve-3d"
      }}
      className="
        relative
        px-10
        py-5
        rounded-2xl
        text-white
        font-bold
        text-xl

        bg-white/10
        backdrop-blur-xl

        border
        border-white/30

        shadow-[0_15px_35px_rgba(0,0,0,0.4)]

        overflow-hidden

        transition-all
        duration-300

        hover:border-cyan-400
      "
    >

      {/* effet lumière */}
      <span
        className="
          absolute
          inset-0
          bg-gradient-to-r
          from-cyan-400/20
          via-blue-500/20
          to-purple-500/20
        "
      />


      <span className="relative z-10 flex items-center gap-3">

        🎮

        Rejoindre une partie

      </span>


    </motion.button>
  );
}