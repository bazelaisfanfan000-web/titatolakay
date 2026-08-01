"use client";

import {
  useState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  auth,
} from "@/lib/firebase";

import BackButton from "@/components/BackButton";


/*
====================================================
PAGE RÈGLES IMPORTANTES WINCASH
====================================================
*/

export default function RulesPage() {


  const router = useRouter();


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    accepted,
    setAccepted,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    animating,
    setAnimating,
  ] = useState(true);


  /*
  ==================================================
  VÉRIFIER SI DÉJÀ ACCEPTÉ
  ==================================================
  */

  useEffect(() => {

    const checkRulesAccepted = async () => {

      try {

        const user = auth.currentUser;

        if (!user) {

          router.push(
            "/login"
          );

          return;

        }


        const token =
          await user.getIdToken();


        const response =
          await fetch(
            "/api/rules/accept",
            {
              method: "GET",
              headers: {
                "Authorization":
                  `Bearer ${token}`,
              },
            }
          );


        if (response.ok) {

          const data =
            await response.json();

          if (data.alreadyAccepted) {

            router.push(
              "/dashboard"
            );

          }

        }

      }
      catch (error) {

        console.error(
          "Erreur vérification règles:",
          error
        );

      }

    };


    checkRulesAccepted();

  }, [router]);


  /*
  ==================================================
  ACCEPTER LES RÈGLES
  ==================================================
  */

  const acceptRules = async () => {

    try {

      setLoading(true);


      const user = auth.currentUser;

      if (!user) {

        router.push(
          "/login"
        );

        return;

      }


      /*
      ============================================
      APPEL API POUR ENREGISTRER ACCEPTATION
      ============================================
      */

      const token =
        await user.getIdToken();


      const response =
        await fetch(
          "/api/rules/accept",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "Authorization":
                `Bearer ${token}`,
            },
          }
        );


      if (!response.ok) {
        const text = await response.text();
        console.error("[RULES] Erreur réponse:", response.status, text);
        throw new Error(
          `Erreur ${response.status}: ${text || "Erreur lors de l'acceptation des règles"}`
        );
      }

      const data = await response.json();
      console.log("[RULES] Réponse succès:", data);


      /*
      ============================================
      REDIRECTION DASHBOARD
      ============================================
      */

      router.push(
        "/dashboard"
      );

    }
    catch (error) {

      console.error(
        "Erreur acceptation règles:",
        error
      );

      alert(
        "Une erreur est survenue. Veuillez réessayer."
      );

    }
    finally {

      setLoading(false);

    }

  };


  /*
  ==================================================
  RENDER
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
          DÉCORATION GAUCHE
      ========================================== */}

      <div
        className="
          pointer-events-none
          fixed
          -left-24
          top-24
          h-64
          w-64
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />


      {/* ==========================================
          DÉCORATION DROITE
      ========================================== */}

      <div
        className="
          pointer-events-none
          fixed
          -right-24
          bottom-24
          h-64
          w-64
          rounded-full
          bg-purple-600/10
          blur-3xl
        "
      />


      {/* ==========================================
          CONTENEUR MOBILE
      ========================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          min-h-screen
          w-full
          max-w-[430px]
          px-4
          pb-10
        "
      >


        {/* ========================================
            RETOUR
        ======================================== */}

        <div
          className="
            pt-8
          "
        >

          <BackButton />

        </div>


        {/* ========================================
            HEADER
        ======================================== */}

        <motion.header
          className="
            mt-7
            mb-6
          "

          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >


          <h1
            className="
              text-[24px]
              font-black
              tracking-tight
            "
          >

            ⚡ Règles importantes WinCash

          </h1>


          <p
            className="
              mt-2
              text-[11px]
              leading-5
              text-white/35
            "
          >

            Bienvenue sur WinCash. Avant de commencer, veuillez lire les règles importantes concernant les parties et les gains.

          </p>


        </motion.header>


        {/* ========================================
            CARTE RÈGLES
        ======================================== */}

        <motion.div
          className="
            space-y-3
          "

          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.2,
          }}
        >


          {/* 🎮 Règles des parties */}

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.025]
              backdrop-blur-md
              p-4
              shadow-[0_8px_30px_rgba(0,0,0,0.2)]
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
                mb-3
              "
            >


              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-500/20
                  bg-blue-500/10
                  text-lg
                "
              >

                🎮

              </div>


              <h3
                className="
                  text-[13px]
                  font-black
                "
              >

                Règles des parties

              </h3>


            </div>


            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/60
              "
            >


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-blue-400
                  "
                />

                Chaque joueur doit respecter les règles du jeu.

              </li>


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-blue-400
                  "
                />

                La triche, la manipulation des parties ou l'utilisation de bugs sont interdites.

              </li>


            </ul>


          </div>


          {/* 💰 Système de gains */}

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.025]
              backdrop-blur-md
              p-4
              shadow-[0_8px_30px_rgba(0,0,0,0.2)]
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
                mb-3
              "
            >


              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-green-500/20
                  bg-green-500/10
                  text-lg
                "
              >

                💰

              </div>


              <h3
                className="
                  text-[13px]
                  font-black
                "
              >

                Système de gains

              </h3>


            </div>


            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/60
              "
            >


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-green-400
                  "
                />

                Les joueurs gagnent selon le résultat officiel de la partie.

              </li>


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-green-400
                  "
                />

                Le partage des gains est de 50/50 selon les règles WinCash.

              </li>


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-green-400
                  "
                />

                Les montants des gains sont affichés avant chaque partie.

              </li>


            </ul>


          </div>


          {/* 🏦 Frais de plateforme */}

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.025]
              backdrop-blur-md
              p-4
              shadow-[0_8px_30px_rgba(0,0,0,0.2)]
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
                mb-3
              "
            >


              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-yellow-500/20
                  bg-yellow-500/10
                  text-lg
                "
              >

                🏦

              </div>


              <h3
                className="
                  text-[13px]
                  font-black
                "
              >

                Frais de plateforme

              </h3>


            </div>


            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/60
              "
            >


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-yellow-400
                  "
                />

                Une commission peut être appliquée par WinCash pour le fonctionnement du service.

              </li>


            </ul>


          </div>


          {/* 🔐 Sécurité du compte */}

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.025]
              backdrop-blur-md
              p-4
              shadow-[0_8px_30px_rgba(0,0,0,0.2)]
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
                mb-3
              "
            >


              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-purple-500/20
                  bg-purple-500/10
                  text-lg
                "
              >

                🔐

              </div>


              <h3
                className="
                  text-[13px]
                  font-black
                "
              >

                Sécurité du compte

              </h3>


            </div>


            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/60
              "
            >


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-purple-400
                  "
                />

                Chaque joueur est responsable de son compte.

              </li>


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-purple-400
                  "
                />

                Les activités suspectes peuvent entraîner une vérification ou une suspension.

              </li>


            </ul>


          </div>


          {/* ⚠️ Responsabilité */}

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.025]
              backdrop-blur-md
              p-4
              shadow-[0_8px_30px_rgba(0,0,0,0.2)]
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
                mb-3
              "
            >


              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-red-500/20
                  bg-red-500/10
                  text-lg
                "
              >

                ⚠️

              </div>


              <h3
                className="
                  text-[13px]
                  font-black
                "
              >

                Responsabilité

              </h3>


            </div>


            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/60
              "
            >


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-red-400
                  "
                />

                Les joueurs doivent vérifier leurs mises avant de rejoindre une partie.

              </li>


              <li
                className="
                  flex
                  items-start
                  gap-2
                "
              >

                <span
                  className="
                    mt-1
                    h-1
                    w-1
                    shrink-0
                    rounded-full
                    bg-red-400
                  "
                />

                Les décisions de jeu appartiennent au joueur.

              </li>


            </ul>


          </div>


        </motion.div>


        {/* ========================================
            CASE À COCHER
        ======================================== */}

        <motion.div
          className="
            mt-6
          "

          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.4,
          }}
        >


          <label
            className="
              flex
              items-start
              gap-3
              cursor-pointer
            "
          >


            <div
              className="
                relative
                mt-0.5
                flex
                h-5
                w-5
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-blue-400/40
                bg-blue-500/10
                transition-all
                hover:border-blue-300/60
                hover:bg-blue-500/20
              "
            >


              <input
                type="checkbox"
                checked={accepted}
                onChange={(
                  e
                ) => {
                  setAccepted(
                    e.target.checked
                  );
                }}
                className="
                  sr-only
                "
              />


              <AnimatePresence>


                {
                  accepted && (
                    <motion.div
                      initial={{
                        scale: 0,
                      }}
                      animate={{
                        scale: 1,
                      }}
                      exit={{
                        scale: 0,
                      }}
                      className="
                        h-3
                        w-3
                        rounded-sm
                        bg-blue-400
                      "
                    />
                  )
                }


              </AnimatePresence>


            </div>


            <p
              className="
                text-[10px]
                leading-4
                text-white/70
              "
            >

              J'ai lu et compris les règles importantes de WinCash

            </p>


          </label>


        </motion.div>


        {/* ========================================
            BOUTON CONTINUER
        ======================================== */}

        <motion.button
          type="button"

          disabled={
            !accepted ||
            loading
          }

          whileTap={{
            scale: 0.97,
            y: 3,
          }}

          onClick={acceptRules}

          className="
            mt-4
            flex
            h-12
            w-full
            items-center
            justify-center
            rounded-xl
            border
            border-blue-400/40
            bg-blue-500/20
            py-3
            text-[12px]
            font-black
            text-blue-100
            shadow-[0_4px_0_rgba(30,64,175,0.8),0_0_18px_rgba(37,99,235,0.12)]
            backdrop-blur-md
            transition-all
            hover:border-blue-300/60
            hover:bg-blue-500/30
            hover:shadow-[0_5px_0_rgba(30,64,175,0.8),0_0_25px_rgba(37,99,235,0.2)]
            active:translate-y-[3px]
            active:shadow-none
            disabled:cursor-not-allowed
            disabled:opacity-50
            disabled:hover:bg-blue-500/20
            disabled:hover:shadow-[0_4px_0_rgba(30,64,175,0.8),0_0_18px_rgba(37,99,235,0.12)]
          "

          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.6,
          }}
        >

          {
            loading
              ? "Chargement..."
              : "Continuer"
          }

        </motion.button>


      </div>


    </main>

  );

}
