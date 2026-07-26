"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ref,
  onValue,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  useRouter,
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

  playersCount: number;

  maxPlayers: number;

  status: string;

};


/*
====================================================
PAGE REJOINDRE UNE PARTIE
====================================================
*/

export default function JoinGame() {


  const router = useRouter();


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(false);


  /*
  ==================================================
  CHARGER LES PARTIES EN TEMPS RÉEL
  ==================================================
  */

  useEffect(() => {


    const roomsRef =
      ref(
        database,
        "rooms"
      );


    const unsubscribe =
      onValue(
        roomsRef,
        (snapshot) => {


          const data =
            snapshot.val();


          /*
          ==========================================
          AUCUNE PARTIE
          ==========================================
          */

          if (!data) {

            setRooms([]);

            return;

          }


          const list: Room[] = [];


          /*
          ==========================================
          FILTRER LES PARTIES DISPONIBLES
          ==========================================
          */

          Object.entries(data)
            .forEach(
              (
                [
                  id,
                  value,
                ]
              ) => {


                const room =
                  value as any;


                /*
                ----------------------------------
                SEULEMENT TITATO
                ----------------------------------
                */

                if (
                  room.gameType &&
                  room.gameType !== "titato"
                ) {

                  return;

                }


                /*
                ----------------------------------
                SEULEMENT PARTIES EN ATTENTE
                ----------------------------------
                */

                if (
                  room.status !== "waiting"
                ) {

                  return;

                }


                /*
                ----------------------------------
                PARTIE PAS ENCORE REMPLIE
                ----------------------------------
                */

                const playersCount =
                  Number(
                    room.playersCount || 0
                  );


                const maxPlayers =
                  Number(
                    room.maxPlayers || 2
                  );


                if (
                  playersCount >=
                  maxPlayers
                ) {

                  return;

                }


                /*
                ----------------------------------
                AJOUTER LA PARTIE
                ----------------------------------
                */

                list.push({

                  id,

                  name:
                    room.name ||
                    "Partie TiTaTo",

                  bet:
                    Number(
                      room.bet || 0
                    ),

                  mode:
                    "1 VS 1",

                  gameType:
                    "titato",

                  playersCount,

                  maxPlayers,

                  status:
                    room.status,

                });

              }
            );


          /*
          ==========================================
          METTRE À JOUR LA LISTE
          ==========================================
          */

          setRooms(
            list
          );

        }
      );


    /*
    ================================================
    CLEANUP
    ================================================
    */

    return () => {

      unsubscribe();

    };


  }, []);


  /*
  ==================================================
  REJOINDRE UNE PARTIE
  ==================================================
  */

  async function joinRoom(
    roomId: string
  ) {


    try {


      setLoading(
        true
      );


      /*
      ============================================
      VÉRIFIER UTILISATEUR
      ============================================
      */

      const user =
        auth.currentUser;


      if (!user) {

        alert(
          "Vous devez être connecté"
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

                roomId,

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
      REDIRECTION SALLE
      ============================================
      */

      router.push(
        `/room/${roomId}`
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


      setLoading(
        false
      );


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

            Trouvez une partie TiTaTo disponible.

          </p>


        </header>


        {/* ========================================
            COMPTEUR
        ======================================== */}

        <div
          className="
            mb-4
            flex
            items-center
            justify-between
            rounded-2xl
            border
            border-white/[0.07]
            bg-white/[0.025]
            px-4
            py-3
          "
        >


          <div
            className="
              flex
              items-center
              gap-3
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


            <div>

              <p
                className="
                  text-[11px]
                  font-black
                "
              >

                Parties disponibles

              </p>


              <p
                className="
                  mt-0.5
                  text-[9px]
                  text-white/30
                "
              >

                En attente d'un joueur

              </p>

            </div>

          </div>


          <span
            className="
              rounded-lg
              bg-blue-500/10
              px-3
              py-1
              text-[11px]
              font-black
              text-blue-400
            "
          >

            {rooms.length}

          </span>


        </div>


        {/* ========================================
            AUCUNE PARTIE
        ======================================== */}

        {
          rooms.length === 0 && (

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

                Aucune partie disponible

              </h2>


              <p
                className="
                  mt-2
                  text-[10px]
                  leading-5
                  text-white/30
                "
              >

                Créez une nouvelle partie
                ou revenez plus tard.

              </p>


              <motion.button
                type="button"

                whileTap={{
                  scale: 0.97,
                  y: 3,
                }}

                onClick={() =>
                  router.push(
                    "/create-room"
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

                🎮 Créer une partie

              </motion.button>


            </div>

          )
        }


        {/* ========================================
            LISTE DES PARTIES
        ======================================== */}

        <div
          className="
            space-y-3
          "
        >


          {
            rooms.map(
              (
                room
              ) => (

                <div
                  key={
                    room.id
                  }
                  className="
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

                        TiTaTo · 1 VS 1

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

                      1 VS 1

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


                  </div>


                  {/* =================================
                      BOUTON REJOINDRE
                  ================================= */}

                  <motion.button
                    type="button"

                    disabled={
                      loading
                    }

                    whileTap={{
                      scale: 0.97,
                      y: 3,
                    }}

                    onClick={() =>
                      joinRoom(
                        room.id
                      )
                    }

                    className="
                      mt-3
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
                    "
                  >

                    {loading
                      ? "Connexion..."
                      : "🚀 Rejoindre la partie"
                    }

                  </motion.button>


                </div>

              )
            )

          }


        </div>


      </div>


    </main>

  );

}