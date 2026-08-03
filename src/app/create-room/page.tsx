"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  auth,
} from "@/lib/firebase";

import BackButton
  from "@/components/BackButton";


/*
========================================
PAGE CRÉER UNE PARTIE Wincash
========================================
*/

export default function CreateRoomPage() {

  /*
  ======================================
  ROUTER
  ======================================
  */

  const router =
    useRouter();


  /*
  ======================================
  NOM DE LA PARTIE
  ======================================
  */

  const [
    name,
    setName,
  ] = useState("");


  /*
  ======================================
  MISE
  ======================================
  */

  const [
    bet,
    setBet,
  ] = useState("");


  /*
  ======================================
  CHARGEMENT
  ======================================
  */

  const [
    loading,
    setLoading,
  ] = useState(false);


  /*
  ======================================
  ERREUR
  ======================================
  */

  const [
    error,
    setError,
  ] = useState("");


  /*
  ======================================
  MODAL SOLDE INSUFFISANT
  ======================================
  */

  const [
    showAd,
    setShowAd,
  ] = useState(false);


  /*
  ======================================
  CRÉER LA PARTIE
  ======================================
  */

  async function createRoom() {

    try {

      setError("");


      /*
      Vérifier utilisateur
      */

      const user =
        auth.currentUser;


      if (!user) {

        throw new Error(
          "Connecte-toi d'abord."
        );

      }


      /*
      Vérifier mise
      */

      if (
        !bet ||
        Number(bet) < 25
      ) {

        throw new Error(
          "La mise minimum est de 25 HTG."
        );

      }


      if (
        Number(bet) > 10000
      ) {

        throw new Error(
          "La mise maximum est de 10 000 HTG."
        );

      }


      /*
      Mise en chargement
      */

      setLoading(true);


      /*
      Récupérer token Firebase
      */

      const token =
        await user.getIdToken();


      /*
      Appel API
      */

      const response =
        await fetch(
          "/api/game/create",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${token}`,

            },

            body:
              JSON.stringify({

                name:
                  name.trim()
                    ? name.trim()
                    : "Partie Wincash",

                bet:
                  Number(bet),

                /*
                Le mode est toujours 1v1
                */

                mode:
                  "1v1",

                gameType:
                  "titato",

              }),

          }
        );


      /*
      Lire réponse
      */

      const data =
        await response.json();


      /*
      Vérifier réponse
      */

      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Impossible de créer la partie."
        );

      }


      /*
      Redirection vers
      la salle d'attente
      */

      router.push(
        `/room/${data.roomId}`
      );


    } catch (
      err: any
    ) {

      console.error(
        "Erreur création partie :",
        err
      );


      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.";


      setError(
        message
      );


      /*
      Afficher modal
      si solde insuffisant
      */

      if (
        message ===
        "Solde insuffisant"
      ) {

        setShowAd(
          true
        );

      }


    } finally {

      setLoading(
        false
      );

    }

  }


  /*
  ======================================
  INTERFACE
  ======================================
  */

  return (

    <main className="min-h-screen bg-[#030303] text-white">


      {/* =================================
          CONTENEUR MOBILE
      ================================= */}

      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden">


        {/* =================================
            CONTENU
        ================================= */}

        <div className="px-4 pb-10 pt-12">


          {/* =================================
              BOUTON RETOUR
          ================================= */}

          <div className="mb-7">

            <BackButton />

          </div>


          {/* =================================
              TITRE
          ================================= */}

          <h1 className="mb-6 text-center text-[21px] font-black tracking-tight">

            Créer une partie

          </h1>


          {/* =================================
              CARTE PRINCIPALE
          ================================= */}

          <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4">


            {/* =================================
                NOM
            ================================= */}

            <div className="mb-4">

              <label className="mb-2 block text-[10px] font-bold text-white/50">

                Nom de la partie

              </label>


              <input
                type="text"
                value={
                  name
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Ex. Duel Wincash"
                maxLength={
                  40
                }
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/40"
              />

            </div>


            {/* =================================
                MISE
            ================================= */}

            <div className="mb-5">

              <label className="mb-2 block text-[10px] font-bold text-white/50">

                Mise de la partie

              </label>


              <div className="relative">


                <input
                  type="number"
                  value={
                    bet
                  }
                  onChange={(
                    event
                  ) =>
                    setBet(
                      event.target.value
                    )
                  }
                  placeholder="0"
                  min="1"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 pr-14 text-sm font-bold text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/40"
                />


                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30">

                  HTG

                </span>


              </div>


              <p className="mt-2 text-[9px] text-white/25">

                La même mise sera demandée à ton adversaire.

              </p>

            </div>


            {/* =================================
                RÉSUMÉ DU DUEL
            ================================= */}

            <div className="mb-4 rounded-xl border border-blue-500/15 bg-blue-600/[0.06] px-3 py-3">


              <div className="flex items-center justify-between">


                <div className="flex items-center gap-2">


                  <span className="text-sm">

                    ⚔️

                  </span>


                  <div>

                    <p className="text-[10px] font-black">

                      Duel 1 VS 1

                    </p>

                    <p className="mt-0.5 text-[8px] text-white/30">

                      Affronte un autre joueur

                    </p>

                  </div>


                </div>


                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[8px] font-bold text-blue-300">

                  1v1

                </span>


              </div>


            </div>


            {/* =================================
                ERREUR
            ================================= */}

            {error && (

              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] leading-4 text-red-300">

                {error}

              </div>

            )}


            {/* =================================
                BOUTON CRÉER
                3D BLEU TRANSPARENT
            ================================= */}

            <button
              type="button"
              onClick={
                createRoom
              }
              disabled={
                loading
              }
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
                text-xs
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
              "
            >

              {loading
                ? "Création..."
                : "🎮 Créer la partie"}

            </button>


          </section>


          {/* =================================
              INFO BAS DE PAGE
          ================================= */}

          <div className="mt-4 flex items-center justify-center gap-2">

            <span className="text-[9px] text-white/20">

              🔒

            </span>

            <p className="text-center text-[9px] text-white/25">

              Ta mise sera sécurisée pendant la partie.

            </p>

          </div>


        </div>


      </div>


      {/* =================================
          MODAL SOLDE INSUFFISANT
      ================================= */}

      {showAd && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">


          <div className="w-full max-w-[360px] rounded-[24px] border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl">


            {/* ICÔNE */}

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-2xl">

              💰

            </div>


            {/* TITRE */}

            <h2 className="mt-4 text-center text-lg font-black">

              Solde insuffisant

            </h2>


            {/* TEXTE */}

            <p className="mt-2 text-center text-[11px] leading-5 text-white/40">

              Ton solde ne permet pas de créer cette partie.

            </p>


            {/* ACTIONS */}

            <div className="mt-5 flex gap-2">


              <button
                type="button"
                onClick={() =>
                  setShowAd(
                    false
                  )
                }
                className="
                  flex
                  h-11
                  flex-1
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/30
                  bg-blue-500/10
                  text-center
                  text-[10px]
                  font-black
                  text-blue-100
                  shadow-[0_3px_0_rgba(30,64,175,0.6)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/50
                  hover:bg-blue-500/20
                  active:translate-y-[2px]
                  active:shadow-none
                "
              >

                Fermer

              </button>


              <button
                type="button"
                onClick={() => {

                  window.open(
                    "https://omg10.com/4/11336319",
                    "_blank"
                  );

                  setShowAd(
                    false
                  );

                }}
                className="
                  flex
                  h-11
                  flex-1
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/40
                  bg-blue-500/20
                  text-center
                  text-[10px]
                  font-black
                  text-blue-100
                  shadow-[0_3px_0_rgba(30,64,175,0.8),0_0_15px_rgba(37,99,235,0.12)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/60
                  hover:bg-blue-500/30
                  active:translate-y-[2px]
                  active:shadow-none
                "
              >

                🎬 Voir une pub

              </button>


            </div>


          </div>


        </div>

      )}


    </main>

  );

}