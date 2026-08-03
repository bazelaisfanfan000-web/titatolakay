"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ref,
  onValue,
} from "firebase/database";

import {
  database,
} from "@/lib/firebase";

import {
  motion,
} from "framer-motion";


/*
====================================================
COMPTE À REBOURS Wincash
====================================================
*/

export default function CountdownPage() {

  const params = useParams();

  const router = useRouter();

  const id = params.id as string;


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    count,
    setCount,
  ] = useState(5);


  const [
    ready,
    setReady,
  ] = useState(false);


  const [
    roomName,
    setRoomName,
  ] = useState("Partie Wincash");


  /*
  ==================================================
  RÉCUPÉRER LE TEMPS DE DÉPART
  ==================================================
  */

  useEffect(() => {

    if (!id) {
      return;
    }


    const roomRef = ref(
      database,
      `rooms/${id}`
    );


    let countdownAt: number | null = null;

    let interval:
      ReturnType<typeof setInterval> | null = null;


    /*
    ================================================
    CALCUL DU COMPTE À REBOURS
    ================================================
    */

    const startCountdown = (
      startTime: number
    ) => {

      if (interval) {
        clearInterval(interval);
      }


      countdownAt = startTime;


      const updateCountdown = () => {

        const now = Date.now();


        const elapsed =
          Math.floor(
            (now - startTime) / 1000
          );


        const remaining =
          Math.max(
            0,
            5 - elapsed
          );


        setCount(
          remaining
        );


        /*
        ============================================
        COMPTE À REBOURS TERMINÉ
        ============================================
        */

        if (remaining <= 0) {

          if (interval) {

            clearInterval(
              interval
            );

            interval = null;

          }


          setReady(true);

          return;

        }

      };


      /*
      PREMIÈRE MISE À JOUR IMMÉDIATE
      */

      updateCountdown();


      /*
      MISE À JOUR TOUTES LES 100 MS
      */

      interval =
        setInterval(
          updateCountdown,
          100
        );

    };


    /*
    =================================================
    ÉCOUTER LA SALLE
    =================================================
    */

    const unsubscribe =
      onValue(
        roomRef,
        (snapshot) => {

          const room =
            snapshot.val();


          if (!room) {
            return;
          }


          /*
          NOM DE LA PARTIE
          */

          setRoomName(
            room.name ||
            "Partie Wincash"
          );


          /*
          TEMPS DE DÉPART
          */

          const firebaseCountdownAt =
            Number(
              room.countdownAt || 0
            );


          /*
          SI FIREBASE A LE TIMESTAMP
          */

          if (
            firebaseCountdownAt > 0
          ) {

            /*
            ÉVITE DE REDÉMARRER
            LE COMPTE À REBOURS
            */

            if (
              countdownAt !==
              firebaseCountdownAt
            ) {

              startCountdown(
                firebaseCountdownAt
              );

            }

          }

        }
      );


    /*
    =================================================
    CLEANUP
    =================================================
    */

    return () => {

      unsubscribe();


      if (interval) {

        clearInterval(
          interval
        );

      }

    };

  }, [
    id,
  ]);


  /*
  ==================================================
  REDIRECTION VERS LE JEU
  ==================================================
  */

  useEffect(() => {

    if (!ready) {
      return;
    }


    const timer =
      setTimeout(
        () => {

          router.replace(
            `/game/${id}`
          );

        },
        700
      );


    return () => {

      clearTimeout(
        timer
      );

    };

  }, [
    ready,
    id,
    router,
  ]);


  /*
  ==================================================
  AFFICHAGE
  ==================================================
  */

  return (

    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#020617]
        text-white
      "
    >


      {/* ==========================================
          LUMIÈRE BLEUE
      ========================================== */}

      <motion.div
        animate={{
          x: [
            0,
            40,
            0,
          ],

          y: [
            0,
            25,
            0,
          ],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          pointer-events-none
          absolute
          -left-24
          top-10
          h-72
          w-72
          rounded-full
          bg-blue-600/20
          blur-3xl
        "
      />


      {/* ==========================================
          LUMIÈRE CYAN
      ========================================== */}

      <motion.div
        animate={{
          x: [
            0,
            -40,
            0,
          ],

          y: [
            0,
            -20,
            0,
          ],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          pointer-events-none
          absolute
          -bottom-24
          -right-24
          h-72
          w-72
          rounded-full
          bg-cyan-500/15
          blur-3xl
        "
      />


      {/* ==========================================
          CONTENU MOBILE
      ========================================== */}

      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          w-full
          flex-col
          items-center
          justify-center
          px-6
        "
      >


        {/* ========================================
            LOGO
        ======================================== */}

        <motion.div
          animate={{
            scale: [
              1,
              1.08,
              1,
            ],

            rotate: [
              0,
              3,
              -3,
              0,
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            mb-6
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-3xl
            border
            border-blue-400/20
            bg-blue-500/10
            text-4xl
            shadow-[0_0_40px_rgba(37,99,235,0.2)]
          "
        >

          🎮

        </motion.div>


        {/* ========================================
            TITRE
        ======================================== */}

        <h1
          className="
            text-center
            text-3xl
            font-black
            tracking-tight
          "
        >

          Wincash

        </h1>


        {/* ========================================
            NOM PARTIE
        ======================================== */}

        <p
          className="
            mt-2
            max-w-[280px]
            truncate
            text-center
            text-xs
            font-medium
            text-white/40
          "
        >

          {roomName}

        </p>


        {/* ========================================
            MESSAGE
        ======================================== */}

        <p
          className="
            mt-8
            text-center
            text-sm
            font-medium
            text-white/50
          "
        >

          {ready
            ? "Préparez-vous !"
            : "La partie commence dans"
          }

        </p>


        {/* ========================================
            COMPTEUR
        ======================================== */}

        <div
          className="
            relative
            mt-5
            flex
            h-44
            w-44
            items-center
            justify-center
          "
        >


          {/* CERCLE EXTÉRIEUR */}

          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="
              absolute
              inset-0
              rounded-full
              border
              border-blue-500/20
              border-t-blue-400/70
            "
          />


          {/* CERCLE INTÉRIEUR */}

          <div
            className="
              absolute
              inset-4
              rounded-full
              border
              border-white/[0.06]
              bg-white/[0.025]
              backdrop-blur-xl
            "
          />


          {/* CHIFFRE */}

          <motion.div
            key={count}
            initial={{
              scale: 1.5,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
            }}
            className="
              relative
              z-10
              text-8xl
              font-black
              leading-none
              text-cyan-400
              drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]
            "
          >

            {count}

          </motion.div>

        </div>


        {/* ========================================
            MESSAGE FINAL
        ======================================== */}

        {ready && (

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="
              mt-6
              text-center
              text-sm
              font-black
              text-green-400
            "
          >

            🚀 Début de la partie !

          </motion.div>

        )}


        {/* ========================================
            INDICATEUR
        ======================================== */}

        {!ready && (

          <div
            className="
              mt-8
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              uppercase
              tracking-widest
              text-white/25
            "
          >

            <span
              className="
                h-1.5
                w-1.5
                animate-pulse
                rounded-full
                bg-cyan-400
              "
            />

            Préparation de la partie

          </div>

        )}

      </div>

    </main>

  );

}