"use client";

import {
  useRouter
} from "next/navigation";

import {
  motion
} from "framer-motion";

export default function MorePage() {

  const router = useRouter();

  return (

    <main
      className="
      min-h-screen
      relative
      overflow-hidden
      bg-gradient-to-br
      from-[#020617]
      via-[#07152f]
      to-black
      text-white
      px-4
      flex
      justify-center
      "
    >

      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0]
        }}
        transition={{
          duration: 6,
          repeat: Infinity
        }}
        className="
        absolute
        w-52
        h-52
        bg-blue-500/20
        rounded-full
        blur-3xl
        top-10
        left-[-40px]
        "
      />

      <section
        className="
        relative
        z-10
        w-full
        max-w-xs
        pt-16
        "
      >

        <button
          onClick={() => router.back()}
          className="
          mb-6
          text-sm
          bg-white/10
          border
          border-white/20
          rounded-xl
          px-4
          py-2
          "
        >
          ⬅️ Retour
        </button>

        <motion.h1
          initial={{
            opacity: 0,
            y: -20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="
          text-xl
          font-black
          text-center
          mb-8
          "
        >
          ➕ Plus
        </motion.h1>

        <div
          className="
          flex
          flex-col
          gap-4
          "
        >

          <motion.button
            whileTap={{
              scale: .95
            }}
            whileHover={{
              scale: 1.03
            }}
            onClick={() => router.push("/spectator")}
            className="
            w-full
            py-5
            rounded-2xl
            font-bold
            text-base
            bg-gradient-to-b
            from-blue-400
            to-blue-700
            border
            border-blue-300/40
            shadow-[0_6px_0_#123a8a]
            "
          >
            👁️ Mode spectateur
          </motion.button>

          <motion.button
            whileTap={{
              scale: .95
            }}
            whileHover={{
              scale: 1.03
            }}
            onClick={() => router.push("/leaderboard")}
            className="
            w-full
            py-5
            rounded-2xl
            font-bold
            text-base
            bg-white/20
            backdrop-blur-xl
            border
            border-white/30
            shadow-[0_6px_0_rgba(255,255,255,0.15)]
            "
          >
            🏆 Classement
          </motion.button>

          {/* Boutons ajoutés vers le bas */}

          <motion.button
            whileTap={{
              scale: .95
            }}
            whileHover={{
              scale: 1.03
            }}
            onClick={() => router.push("/friends")}
            className="
            w-full
            py-5
            rounded-2xl
            font-bold
            text-base
            bg-gradient-to-b
            from-green-400
            to-green-700
            border
            border-green-300/40
            shadow-[0_6px_0_#166534]
            "
          >
            👥 Amis
          </motion.button>

          <motion.button
            whileTap={{
              scale: .95
            }}
            whileHover={{
              scale: 1.03
            }}
            onClick={() => router.push("/friend-requests")}
            className="
            w-full
            py-5
            rounded-2xl
            font-bold
            text-base
            bg-gradient-to-b
            from-pink-400
            to-pink-700
            border
            border-pink-300/40
            shadow-[0_6px_0_#831843]
            "
          >
            📩 Demandes d'ami
          </motion.button>

        </div>

      </section>

    </main>

  );

}