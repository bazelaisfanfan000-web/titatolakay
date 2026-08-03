"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ref,
  onValue,
  off,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  useRouter,
  useParams,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import BackButton from "@/components/BackButton";


/*
====================================================
TYPE ROOM
====================================================
*/

type Room = {

  id: string;

  name: string;

  bet: number;

  mode: string;

  gameType: string;

  creatorId: string;

  playersCount: number;

  maxPlayers: number;

  status: string;

  pot: number;

  players?: Record<string, any>;

};


/*
====================================================
PAGE REJOINDRE UNE PARTIE SPÉCIFIQUE
====================================================
*/

export default function JoinGameById() {


  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    room,
    setRoom,
  ] = useState<Room | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    joining,
    setJoining,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  /*
  ==================================================
  CHARGER LA PARTIE EN TEMPS RÉEL
  ==================================================
  */

  useEffect(() => {

    if (!gameId) {
      setError("ID de partie invalide");
      setLoading(false);
      return;
    }

    const roomRef =
      ref(
        database,
        `rooms/${gameId}`
      );


    const handleRoomChange = (
      snapshot: any
    ) => {

      const data =
        snapshot.val();


      /*
      ==========================================
      PARTIE NON TROUVÉE
      ==========================================
      */

      if (!data) {

        setError(
          "Cette partie n'existe pas ou a été supprimée"
        );

        setRoom(null);

        setLoading(false);

        return;

      }


      /*
      ==========================================
      PARTIE TROUVÉE
      ==========================================
      */

      const roomData: Room = {
        id: gameId,
        name: data.name || "Partie Wincash",
        bet: Number(data.bet || 0),
        mode: data.mode || "1v1",
        gameType: data.gameType || "titato",
        creatorId: data.creatorId,
        playersCount: Number(data.playersCount || 0),
        maxPlayers: Number(data.maxPlayers || 2),
        status: data.status,
        pot: Number(data.pot || 0),
        players: data.players,
      };


      setRoom(roomData);

      setLoading(false);

      setError(null);

    };


    onValue(
      roomRef,
      handleRoomChange
    );


    /*
    ================================================
    CLEANUP
    ================================================
    */

    return () => {

      off(roomRef);

    };

  }, [gameId]);


  /*
  ==================================================
  REJOINDRE LA PARTIE
  ==================================================
  */

  async function joinGame() {

    try {

      setJoining(true);


      /*
      ============================================
      VÉRIFIER UTILISATEUR
      ============================================
      */

      const user =
        auth.currentUser;


      if (!user) {

        alert(
          "Vous devez être connecté pour rejoindre une partie"
        );

        router.push(
          "/login"
        );

        return;

      }


      /*
      ============================================
      TOKEN FIREBASE
      ============================================
      */

      const token =
        await user.getIdToken();


      /*
      ============================================
      APPEL API
      ============================================
      */

      const response =
        await fetch(
          "/api/game/join",
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
                roomId: gameId,
              }),

          }
        );


      /*
      ============================================
      RÉPONSE API
      ============================================
      */

      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Impossible de rejoindre la partie"
        );

      }


      /*
      ============================================
      REDIRECTION SALLE DE JEU
      ============================================
      */

      router.push(
        `/room/${gameId}`
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

      setJoining(false);

    }

  }


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

        <header
          className="
            mt-7
            mb-6
          "
        >


          <h1
            className="
              text-[24px]
              font-black
              tracking-tight
            "
          >

            Rejoindre une partie

          </h1>


          <p
            className="
              mt-1
              text-[11px]
              text-white/35
            "
          >

            Détails de la partie wincash

          </p>


        </header>


        {/* ========================================
            LOADING
        ======================================== */}

        {
          loading && (

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                p-8
                text-center
              "
            >

              <div
                className="
                  mb-4
                  text-4xl
                "
              >

                🎲

              </div>


              <h2
                className="
                  text-[15px]
                  font-black
                "
              >

                Chargement...

              </h2>


              <p
                className="
                  mt-2
                  text-[10px]
                  leading-5
                  text-white/30
                "
              >

                Récupération des informations de la partie

              </p>


            </div>

          )
        }


        {/* ========================================
            ERREUR
        ======================================== */}

        {
          !loading && error && (

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/5
                p-8
                text-center
              "
            >

              <div
                className="
                  mb-4
                  text-4xl
                "
              >

                ❌

              </div>


              <h2
                className="
                  text-[15px]
                  font-black
                  text-red-400
                "
              >

                Erreur

              </h2>


              <p
                className="
                  mt-2
                  text-[10px]
                  leading-5
                  text-white/30
                "
              >

                {error}

              </p>


              <motion.button
                type="button"

                whileTap={{
                  scale: 0.97,
                  y: 3,
                }}

                onClick={() =>
                  router.push(
                    "/join-room"
                  )
                }

                className="
                  mt-5
                  flex
                  h-10
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/40
                  bg-blue-500/20
                  py-3
                  text-[11px]
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
                "
              >

                🎮 Voir les parties disponibles

              </motion.button>


            </div>

          )
        }


        {/* ========================================
            DÉTAILS PARTIE
        ======================================== */}

        {
          !loading && !error && room && (

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-white/[0.08]
                bg-white/[0.025]
                p-4
                shadow-[0_8px_30px_rgba(0,0,0,0.2)]
              "
            >


              {/* =================================
                  NOM + MODE
              ================================= */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h2
                    className="
                      truncate
                      text-[14px]
                      font-black
                    "
                  >

                    🎮 {room.name}

                  </h2>


                  <p
                    className="
                      mt-1
                      text-[9px]
                      text-white/30
                    "
                  >

                    Wincash · {room.mode.toUpperCase()}

                  </p>

                </div>


                <div
                  className="
                    shrink-0
                    rounded-lg
                    border
                    border-blue-500/20
                    bg-blue-500/10
                    px-2.5
                    py-1.5
                    text-[9px]
                    font-black
                    text-blue-400
                  "
                >

                  {room.mode.toUpperCase()}

                </div>


              </div>


              {/* =================================
                  INFORMATIONS
              ================================= */}

              <div
                className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-2
                "
              >


                {/* MISE */}

                <div
                  className="
                    rounded-xl
                    border
                    border-white/[0.05]
                    bg-black/20
                    px-3
                    py-2.5
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
                    {room.bet.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    HTG

                  </p>

                </div>


                {/* POT */}

                <div
                  className="
                    rounded-xl
                    border
                    border-white/[0.05]
                    bg-black/20
                    px-3
                    py-2.5
                  "
                >

                  <p
                    className="
                      text-[8px]
                      text-white/30
                    "
                  >

                    Pot actuel

                  </p>


                  <p
                    className="
                      mt-1
                      text-[11px]
                      font-black
                    "
                  >

                    💎{" "}
                    {room.pot.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    HTG

                  </p>

                </div>


                {/* JOUEURS */}

                <div
                  className="
                    rounded-xl
                    border
                    border-white/[0.05]
                    bg-black/20
                    px-3
                    py-2.5
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
                    className="
                      mt-1
                      text-[11px]
                      font-black
                    "
                  >

                    👥{" "}
                    {room.playersCount}
                    /
                    {room.maxPlayers}

                  </p>

                </div>


                {/* STATUT */}

                <div
                  className="
                    rounded-xl
                    border
                    border-white/[0.05]
                    bg-black/20
                    px-3
                    py-2.5
                  "
                >

                  <p
                    className="
                      text-[8px]
                      text-white/30
                    "
                  >

                    Statut

                  </p>


                  <p
                    className="
                      mt-1
                      text-[11px]
                      font-black
                    "
                  >

                    {
                      room.status === "waiting"
                        ? "⏳ En attente"
                        : room.status === "starting"
                          ? "🚀 Démarrage"
                          : room.status === "playing"
                            ? "🎮 En cours"
                            : "❌ Terminée"
                    }

                  </p>

                </div>


              </div>


              {/* =================================
                  LISTE JOUEURS
              ================================= */}

              {
                room.players && (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-white/[0.05]
                      bg-black/20
                      p-3
                    "
                  >

                    <p
                      className="
                        mb-2
                        text-[8px]
                        text-white/30
                      "
                    >

                      Joueurs dans la partie

                    </p>


                    <div
                      className="
                        space-y-2
                      "
                    >

                      {
                        Object.values(
                          room.players
                        ).map(
                          (
                            player: any,
                            index: number
                          ) => (

                            <div
                              key={
                                player.uid ||
                                index
                              }
                              className="
                                flex
                                items-center
                                gap-2
                              "
                            >

                              <div
                                className="
                                  flex
                                  h-6
                                  w-6
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-blue-500/20
                                  text-[10px]
                                  font-black
                                  text-blue-400
                                "
                              >

                                {
                                  player.symbol ||
                                  "?"
                                }

                              </div>


                              <p
                                className="
                                  text-[10px]
                                  font-medium
                                "
                              >

                                {player.name ||
                                  "Joueur"}

                              </p>


                              {
                                player.ready && (
                                  <span
                                    className="
                                      ml-auto
                                      text-[8px]
                                      text-green-400
                                    "
                                  >

                                    ✅ Prêt

                                  </span>
                                )
                              }

                            </div>

                          )
                        )
                      }

                    </div>

                  </div>
                )
              }


              {/* =================================
                  BOUTON REJOINDRE
              ================================= */}

              <motion.button
                type="button"

                disabled={
                  joining ||
                  room.status !== "waiting" ||
                  room.playersCount >= room.maxPlayers
                }

                whileTap={{
                  scale: 0.97,
                  y: 3,
                }}

                onClick={joinGame}

                className="
                  mt-4
                  flex
                  h-10
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/40
                  bg-blue-500/20
                  py-3
                  text-[11px]
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
              >

                {
                  joining
                    ? "Connexion..."
                    : room.status !== "waiting"
                      ? "Partie non disponible"
                      : room.playersCount >= room.maxPlayers
                        ? "Partie complète"
                        : "🚀 Rejoindre la partie"
                }

              </motion.button>


              {/* =================================
                  MESSAGE AVERTISSEMENT
              ================================= */}

              {
                room.status !== "waiting" && (
                  <p
                    className="
                      mt-3
                      text-center
                      text-[9px]
                      text-white/30
                    "
                  >

                    Cette partie n'est plus disponible pour rejoindre

                  </p>
                )
              }


              {
                room.playersCount >= room.maxPlayers && (
                  <p
                    className="
                      mt-3
                      text-center
                      text-[9px]
                      text-white/30
                    "
                  >

                    Cette partie est complète

                  </p>
                )
              }


            </div>

          )
        }


      </div>


    </main>

  );

}
