"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import {
  onValue,
  ref,
  update,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";



/*
====================================================
TYPE JOUEUR
====================================================
*/

type Player = {
  uid?: string;
  name?: string;
  username?: string;
  symbol?: string;
};


/*
====================================================
PAGE SALLE D'ATTENTE
====================================================
*/

export default function RoomPage() {

  const params = useParams();

  const router = useRouter();

  const id =
    params.id as string;


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    room,
    setRoom,
  ] = useState<any>(null);


  const [
    players,
    setPlayers,
  ] = useState<Player[]>([]);


  const [
    leaving,
    setLeaving,
  ] = useState(false);


  const [
    starting,
    setStarting,
  ] = useState(false);

  const startingRef =
    useRef(false);


  /*
  ==================================================
  FIREBASE - ÉCOUTE DE LA SALLE
  ==================================================
  */

  useEffect(() => {

    if (!id) {
      return;
    }


    const roomRef =
      ref(
        database,
        `rooms/${id}`
      );


    const unsubscribe =
      onValue(
        roomRef,
        (snapshot) => {

          const data =
            snapshot.val();


          /*
          ==========================================
          SALLE SUPPRIMÉE
          ==========================================
          */

          if (!data) {

            router.replace(
              "/dashboard"
            );

            return;

          }


          setRoom(data);


          /*
          ==========================================
          RÉCUPÉRER LES JOUEURS
          ==========================================
          */

          const playerList =
            data.players
              ? Object.values(
                  data.players
                )
              : [];


          setPlayers(
            playerList as Player[]
          );


          /*
          ==========================================
          REDIRECTION COUNTDOWN
          ==========================================
          */

          if (
            data.status === "countdown"
          ) {

            router.replace(
              `/countdown/${id}`
            );

            return;

          }


          /*
          ==========================================
          REDIRECTION JEU
          ==========================================
          */

          if (
            data.status === "playing"
          ) {

            router.replace(
              `/game/${id}`
            );

            return;

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    id,
    router,
  ]);


  /*
  ==================================================
  DÉMARRER LA PARTIE
  ==================================================
  */

  async function startGame() {

    try {

      setStarting(true);

      const user =
        auth.currentUser;

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
          "/api/game/start-game",
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
                roomId: id,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Impossible de démarrer la partie"
        );

      }

      // Redirection vers countdown après succès
      router.replace(
        `/countdown/${id}`
      );

    }
    catch (
      error: any
    ) {

      alert(
        error.message ||
        "Une erreur est survenue"
      );

    }
    finally {

      setStarting(false);

    }

  }

  async function leaveRoom() {

    try {

      setLeaving(true);


      const user =
        auth.currentUser;


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
          "/api/game/leave",
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
                roomId:
                  id,
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Impossible de quitter la partie"
        );

      }


      router.push(
        "/dashboard"
      );

    }
    catch (
      error: any
    ) {

      alert(
        error.message ||
        "Une erreur est survenue"
      );

    }
    finally {

      setLeaving(false);

    }

  }


  /*
  ==================================================
  CHARGEMENT
  ==================================================
  */

  if (!room) {

    return (

      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#020617]
          px-5
          text-white
        "
      >

        <div
          className="
            text-center
          "
        >

          <p
            className="
              text-sm
              font-bold
              text-white/50
            "
          >

            Chargement...

          </p>

        </div>

      </main>

    );

  }


  /*
  ==================================================
  VARIABLES
  ==================================================
  */

  const maxPlayers =
    Number(
      room.maxPlayers ||
      2
    );


  const playersCount =
    players.length;


  const isFull =
    playersCount >=
    maxPlayers;


  const bet =
    Number(
      room.bet ||
      0
    );


  const pot =
    Number(
      room.pot ||
      0
    );


  /*
  ==================================================
  RENDER MOBILE
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
          DÉCORATION
      ========================================== */}

      <div
        className="
          pointer-events-none
          fixed
          -left-24
          top-20
          h-48
          w-48
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />


      <div
        className="
          pointer-events-none
          fixed
          -right-24
          bottom-20
          h-48
          w-48
          rounded-full
          bg-cyan-500/10
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
          pb-8
        "
      >


        {/* ========================================
            TITRE
        ======================================== */}

        <section
          className="
            mt-10
            text-center
          "
        >

          <h2
            className="
              text-[21px]
              font-black
            "
          >

            Salle d'attente

          </h2>


          <p
            className="
              mt-1
              text-[9px]
              text-white/30
            "
          >

            En attente des joueurs

          </p>

        </section>


        {/* ========================================
            CARTE PRINCIPALE
        ======================================== */}

        <section
          className="
            mt-5
            rounded-3xl
            border
            border-white/[0.08]
            bg-white/[0.025]
            p-4
            backdrop-blur-xl
          "
        >


          {/* NOM */}

          <div
            className="
              text-center
            "
          >

            <h3
              className="
                truncate
                text-[16px]
                font-black
              "
            >

              {room.name ||
                "Partie TiTaTo"}

            </h3>


            <p
              className="
                mt-1
                text-[8px]
                text-white/30
              "
            >

              ⭕ TiTaTo
              {" • "}
              {room.mode ||
                "1vs1"}

            </p>

          </div>


          {/* ======================================
              INFORMATIONS
          ====================================== */}

          <div
            className="
              mt-4
              grid
              grid-cols-3
              gap-2
            "
          >


            {/* MISE */}

            <div
              className="
                rounded-xl
                border
                border-white/[0.06]
                bg-black/20
                px-2
                py-3
                text-center
              "
            >

              <p
                className="
                  text-[8px]
                  text-white/30
                "
              >

                Mise

              </p>


              <p
                className="
                  mt-1
                  text-[11px]
                  font-black
                "
              >

                💰{" "}
                {bet.toLocaleString(
                  "fr-FR"
                )}

              </p>

            </div>


            {/* POT */}

            <div
              className="
                rounded-xl
                border
                border-green-500/10
                bg-green-500/[0.04]
                px-2
                py-3
                text-center
              "
            >

              <p
                className="
                  text-[8px]
                  text-white/30
                "
              >

                Pot

              </p>


              <p
                className="
                  mt-1
                  text-[11px]
                  font-black
                  text-green-400
                "
              >

                🪙{" "}
                {pot.toLocaleString(
                  "fr-FR"
                )}

              </p>

            </div>


            {/* JOUEURS */}

            <div
              className="
                rounded-xl
                border
                border-white/[0.06]
                bg-black/20
                px-2
                py-3
                text-center
              "
            >

              <p
                className="
                  text-[8px]
                  text-white/30
                "
              >

                Joueurs

              </p>


              <p
                className={`
                  mt-1
                  text-[11px]
                  font-black
                  ${
                    isFull
                      ? "text-green-400"
                      : "text-white"
                  }
                `}
              >

                👥{" "}
                {playersCount}/
                {maxPlayers}

              </p>

            </div>

          </div>


          {/* ======================================
              JOUEURS
          ====================================== */}

          <div
            className="
              mt-5
            "
          >

            <p
              className="
                mb-2
                text-[9px]
                font-bold
                text-white/30
              "
            >

              JOUEURS

            </p>


            <div
              className="
                space-y-2
              "
            >

              {players.map(
                (
                  player,
                  index
                ) => (

                  <motion.div
                    key={
                      player.uid ||
                      index
                    }
                    initial={{
                      opacity:
                        0,

                      x:
                        -10,
                    }}
                    animate={{
                      opacity:
                        1,

                      x:
                        0,
                    }}
                    className="
                      flex
                      h-[52px]
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      border-white/[0.07]
                      bg-white/[0.025]
                      px-3
                    "
                  >

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-500/10
                        text-sm
                      "
                    >

                      👤

                    </div>


                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >

                      <p
                        className="
                          truncate
                          text-[11px]
                          font-black
                        "
                      >

                        {
                          player.name ||
                          player.username ||
                          "Joueur"
                        }

                      </p>


                      <p
                        className="
                          text-[8px]
                          text-green-400
                        "
                      >

                        ● Prêt

                      </p>

                    </div>


                    <div
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-lg
                        bg-white/[0.05]
                        text-xs
                        font-black
                      "
                    >

                      {
                        player.symbol ||
                        "?"
                      }

                    </div>

                  </motion.div>

                )
              )}


              {/* PLACE VIDE */}

              {!isFull && (

                <div
                  className="
                    flex
                    h-[52px]
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-dashed
                    border-white/[0.10]
                    px-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-xl
                      bg-white/[0.04]
                      text-sm
                    "
                  >

                    ⏳

                  </div>


                  <div>

                    <p
                      className="
                        text-[10px]
                        font-bold
                        text-white/40
                      "
                    >

                      En attente...

                    </p>


                    <p
                      className="
                        text-[8px]
                        text-white/20
                      "
                    >

                      Un joueur doit rejoindre.

                    </p>

                  </div>

                </div>

              )}

            </div>

          </div>


          {/* ======================================
              STATUT
          ====================================== */}

          <motion.div
            animate={
              isFull
                ? {
                    opacity: [
                      0.7,
                      1,
                      0.7,
                    ],
                  }
                : undefined
            }
            transition={{
              duration:
                1.5,

              repeat:
                Infinity,
            }}
            className={`
              mt-4
              rounded-2xl
              px-3
              py-3
              text-center
              ${
                isFull
                  ? "border border-green-500/20 bg-green-500/[0.06]"
                  : "border border-blue-500/15 bg-blue-500/[0.04]"
              }
            `}
          >

            <p
              className={`
                text-[11px]
                font-black
                ${
                  isFull
                    ? "text-green-400"
                    : "text-blue-400"
                }
              `}
            >

              {isFull
                ? "🚀 Partie prête !"
                : "⏳ En attente d'un adversaire"
              }

            </p>


            <p
              className="
                mt-1
                text-[8px]
                text-white/30
              "
            >

              {isFull
                ? "En attente du créateur pour démarrer"
                : "La partie commencera quand tous les joueurs seront prêts."
              }

            </p>

          </motion.div>


          {/* ======================================
              BOUTON COMMENCER (CRÉATEUR SEULEMENT)
          ====================================== */}

          {room.creatorId ===
            auth.currentUser?.uid &&
            room.status ===
              "ready" && (

            <button
              type="button"
              onClick={
                startGame
              }
              disabled={
                starting
              }
              className="
                mt-4
                h-11
                w-full
                rounded-2xl
                border
                border-green-500/20
                bg-green-500/10
                text-[10px]
                font-black
                text-green-400
                transition
                active:scale-[0.97]
                disabled:opacity-50
              "
            >

              {starting
                ? "Démarrage..."
                : "🚀 Commencer la partie"
              }

            </button>

          )}


          {/* ======================================
              BOUTON QUITTER (CRÉATEUR)
          ====================================== */}

          {room.creatorId ===
            auth.currentUser?.uid &&
            room.status ===
              "waiting" && (

            <button
              type="button"
              onClick={
                leaveRoom
              }
              disabled={
                leaving
              }
              className="
                mt-4
                h-11
                w-full
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/10
                text-[10px]
                font-black
                text-red-400
                transition
                active:scale-[0.97]
                disabled:opacity-50
              "
            >

              {leaving
                ? "Quitter..."
                : "❌ Quitter la partie"
              }

            </button>

          )}

        </section>


        {/* ========================================
            FOOTER
        ======================================== */}

        <p
          className="
            mt-4
            text-center
            text-[8px]
            text-white/15
          "
        >

          TiTaTo • Le créateur démarre la partie

        </p>

      </div>

    </main>

  );

}