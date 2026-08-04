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

            Bienvenue sur WinCash. Avant de commencer, veuillez lire attentivement les règles concernant les parties, les gains et les retraits.

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


          {/* Règles des parties */}

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
                Chaque joueur doit respecter les règles officielles du jeu.
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
                La triche, la manipulation des résultats ou l'utilisation de bugs sont strictement interdites. Tout manquement entraînera la suspension définitive du compte.
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
                Toute partie est définitive. Aucune réclamation ne sera acceptée après validation du résultat.
              </li>
            </ul>

          </div>


          {/* Dépôts & Retraits - 100% GRATUITS ! */}

          <div
            className="
              rounded-2xl
              border
              border-green-500/30
              bg-green-500/[0.08]
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
                  text-green-300
                "
              >
                Dépôts & Retraits - 100% GRATUITS !
              </h3>
            </div>

            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/70
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
                Dépôt : Vous déposez 100 HTG, vous recevez 100 HTG sur votre compte. AUCUN FRAIS ! ✅
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
                Retrait : Vous retirez 100 HTG, vous recevez 100 HTG sur votre compte. AUCUN FRAIS ! ✅
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
                Les frais de dépôt (2,9%) et de retrait (5%) sont entièrement pris en charge par WinCash. Vous ne payez rien !
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
                Zéro commission sur les dépôts et retraits. Zéro surprise ! 🎉
              </li>
            </ul>

          </div>


          {/* TRANSACTIONS SÉCURISÉES */}

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
                🔒
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                "
              >
                TRANSACTIONS SÉCURISÉES
              </h3>
            </div>

            <p
              className="
                text-[10px]
                leading-4
                text-white/60
              "
            >
              Tous les dépôts et retraits sont effectués via MonCash, une plateforme de paiement agréée et sécurisée. Vos fonds sont protégés à chaque étape.
            </p>

          </div>


          {/* Comment gagnez-vous de l'argent ? */}

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
                💸
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                "
              >
                Comment gagnez-vous de l'argent ?
              </h3>
            </div>

            <p
              className="
                mb-3
                text-[10px]
                leading-4
                text-white/60
              "
            >
              Quand vous gagnez une partie, vous empochez vos gains.
            </p>

            <p
              className="
                mb-3
                text-[10px]
                leading-4
                text-white/60
              "
            >
              WinCash prélève une commission de 50% UNIQUEMENT sur votre gain.
            </p>

            <div
              className="
                rounded-lg
                border
                border-white/[0.05]
                bg-white/[0.02]
                p-3
              "
            >
              <p
                className="
                  mb-2
                  text-[9px]
                  font-bold
                  text-white/50
                "
              >
                Exemple concret :
              </p>
              <ul
                className="
                  space-y-1
                  text-[9px]
                  text-white/70
                "
              >
                <li>• Vous misez 100 HTG et vous gagnez la partie. ✅</li>
                <li>• Vous avez gagné 100 HTG de bénéfice.</li>
                <li>• Votre gain net après commission WinCash = 50 HTG.</li>
                <li>• Vous recevez donc 150 HTG sur votre compte (100 de mise + 50 de gain net).</li>
                <li>• C'est tout ! Rien d'autre n'est déduit ! 😊</li>
              </ul>
            </div>

          </div>


          {/* Âge légal - 18 ANS MINIMUM 🔞 */}

          <div
            className="
              rounded-2xl
              border
              border-red-500/30
              bg-red-500/[0.08]
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
                👤
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                  text-red-300
                "
              >
                Âge légal - 18 ANS MINIMUM 🔞
              </h3>
            </div>

            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/70
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
                Vous devez avoir au moins 18 ans pour créer un compte sur WinCash.
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
                Toute tentative d'inscription par un mineur entraînera la suspension immédiate du compte et l'annulation des gains éventuels.
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
                En créant un compte, vous certifiez sur l'honneur avoir 18 ans révolus.
              </li>
            </ul>

          </div>


          {/* Conditions de retrait (OFFRE DE LANCEMENT) */}

          <div
            className="
              rounded-2xl
              border
              border-orange-500/30
              bg-orange-500/[0.08]
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
                  border-orange-500/20
                  bg-orange-500/10
                  text-lg
                "
              >
                📌
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                  text-orange-300
                "
              >
                Conditions de retrait (OFFRE DE LANCEMENT)
              </h3>
            </div>

            <ul
              className="
                space-y-2
                text-[10px]
                leading-4
                text-white/70
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
                    bg-orange-400
                  "
                />
                Du 03/07/2026 au 03/09/2026 : Vous pouvez retirer dès que votre solde atteint ×1,5 votre dernier dépôt.
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
                    bg-orange-400
                  "
                />
                (Exemple : Vous déposez 100 HTG, vous gagnez 1 partie, votre solde est à 150 HTG → vous pouvez retirer !) 🚀
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
                    bg-orange-400
                  "
                />
                À partir du 04/09/2026 : Le seuil de retrait passera à ×2 (comme sur les autres plateformes).
              </li>
            </ul>

          </div>


          {/* Sécurité du compte */}

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
                Chaque joueur est unique et responsable de son compte.
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
                Tout partage de compte ou activité suspecte (multiples comptes, utilisation d'outils automatisés) entraînera une vérification obligatoire et pourra conduire à une suspension.
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
                Conservez vos identifiants en lieu sûr. WinCash ne pourra pas être tenu responsable en cas de perte ou de vol.
              </li>
            </ul>

          </div>


          {/* 👥 Réseau social (VYLO) */}

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
                👥
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                "
              >
                Réseau social (VYLO)
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
                L'onglet "Explorer" vous permet de rechercher d'autres joueurs par leur nom d'utilisateur ou leur adresse email.
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
                Pour devenir ami avec un joueur, vous devez lui envoyer une demande d'ami. L'autre joueur doit l'accepter pour que la connexion soit établie.
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
                Tout envoi massif, abusif ou répétitif de demandes d'ami est strictement interdit et pourra entraîner une suspension temporaire ou définitive du compte.
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
                Le harcèlement, l'insulte ou tout comportement malveillant via le chat ou les demandes d'ami entraînera la fermeture immédiate du compte sans remboursement des fonds.
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
                WinCash se réserve le droit de modérer les interactions entre joueurs pour garantir une expérience saine et sécurisée à tous.
              </li>
            </ul>

          </div>


          {/* Responsabilité & litiges */}

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
                ⚖️
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                "
              >
                Responsabilité & litiges
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
                Les joueurs doivent vérifier leurs mises avant de rejoindre une partie. Aucun remboursement ne sera effectué en cas d'erreur.
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
                Les décisions de jeu incombent uniquement au joueur.
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
                🔴 WinCash agit uniquement en tant qu'intermédiaire technique. Les gains dépendent du jeu et de l'adversaire. Le site ne garantit aucun gain et ne peut être tenu responsable des pertes financières. 🔴
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
                En cas de litige entre deux joueurs, la décision du système est finale et sans appel.
              </li>
            </ul>

          </div>


          {/* Règles générales */}

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
                  border-white/[0.08]
                  bg-white/[0.05]
                  text-lg
                "
              >
                📌
              </div>
              <h3
                className="
                  text-[13px]
                  font-black
                "
              >
                Règles générales
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
                    bg-white/40
                  "
                />
                Les dates et heures des parties sont affichées en temps réel.
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
                    bg-white/40
                  "
                />
                Toute tentative de fraude ou d'abus sera sanctionnée par la fermeture immédiate du compte, sans remboursement des fonds.
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
                    bg-white/40
                  "
                />
                WinCash se réserve le droit de modifier les règles à tout moment, avec notification préalable aux joueurs.
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

              ✅ J'ai lu, j'ai compris et j'accepte les règles importantes de WinCash.

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
