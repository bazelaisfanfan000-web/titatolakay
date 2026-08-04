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
  onValue,
  ref,
  remove,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  playGameMove,
} from "@/lib/firebaseGame";

import {
  addPlayerWin,
  addPlayerLose,
} from "@/lib/playerStats";

import {
  checkVyloFriendStatus,
  sendVyloFriendRequest,
} from "@/lib/vylo/vyloFriends";


import TiTaToBoard from "@/components/TiTaToBoard";
import GameTimer from "@/components/GameTimer";
import WinnerModal from "@/components/WinnerModal";
import GameChat from "@/components/GameChat";


type FriendStatus =
  | "none"
  | "pending"
  | "friend";


export default function GamePage() {

  const params =
    useParams();

  const router =
    useRouter();

  const id =
    params.id as string;


  const [
    room,
    setRoom,
  ] = useState<any>(null);


  const [
    board,
    setBoard,
  ] = useState<string[][]>(
    Array.from(
      {
        length: 10,
      },
      () =>
        Array(10).fill("")
    )
  );


  const [
    turn,
    setTurn,
  ] = useState<"X" | "O">(
    "X"
  );


  const [
    winner,
    setWinner,
  ] = useState<string | null>(
    null
  );


  const [
    mySymbol,
    setMySymbol,
  ] = useState<
    "X" | "O" | ""
  >("");


  const [
    turnStartedAt,
    setTurnStartedAt,
  ] = useState<number>(
    0
  );


  const [
    friendStatus,
    setFriendStatus,
  ] = useState<FriendStatus>(
    "none"
  );


  const [
    friendMessage,
    setFriendMessage,
  ] = useState("");


  const [
    gameMessage,
    setGameMessage,
  ] = useState("");


  const [
    drawMessage,
    setDrawMessage,
  ] = useState(false);


  const [
    friendLoading,
    setFriendLoading,
  ] = useState(false);


  const [
    showQuitModal,
    setShowQuitModal,
  ] = useState(false);


  const [
    quitLoading,
    setQuitLoading,
  ] = useState(false);


  const paymentDone =
    useRef(false);


  const friendStatusChecked =
    useRef<string | null>(null);


  /*
  ========================================
  FIREBASE ROOM
  ========================================
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


          if (!data) {
            return;
          }


          setRoom(data);


          if (
            data.game?.board
          ) {

            setBoard(
              data.game.board
            );

          } else {

            setBoard(
              Array.from(
                {
                  length: 10,
                },
                () =>
                  Array(10).fill("")
              )
            );

          }


          if (
            data.game?.turn
          ) {

            setTurn(
              data.game.turn
            );

          }


          setWinner(
            data.game?.winner ||
              null
          );


          setTurnStartedAt(
            data.game?.turnStartedAt ||
              0
          );


          const user =
            auth.currentUser;


          if (
            user &&
            data.players?.[user.uid]
          ) {

            setMySymbol(
              data.players[
                user.uid
              ].symbol
            );

          }


          /*
          ==========================================
          DÉTECTER MATCH NUL (plateau vidé)
          ==========================================
          */

          if (
            data.game?.drawCount &&
            data.game.drawCount > 0
          ) {

            const previousDrawCount =
              room?.game?.drawCount || 0;


            if (
              data.game.drawCount >
              previousDrawCount
            ) {

              // Nouveau match nul détecté
              setDrawMessage(true);

              setTimeout(
                () => {
                  setDrawMessage(false);
                },
                3000
              );

            }

          }

        }
      );


    return () => {
      unsubscribe();
    };

  }, [
    id,
    room,
  ]);


  /*
  ========================================
  TROUVER L'ADVERSAIRE
  ========================================
  */

  function getOpponentId() {

    const user =
      auth.currentUser;


    if (
      !user ||
      !room?.players
    ) {
      return undefined;
    }


    const opponentId =
      Object.keys(
        room.players
      ).find(
        (uid) =>
          uid !== user.uid
      );


    return opponentId ||
      undefined;
  }


  /*
  ========================================
  VÉRIFIER STATUT AMI VYLO
  ========================================
  */

  useEffect(() => {

    if (
      !room ||
      !auth.currentUser ||
      !room.players
    ) {
      return;
    }


    const me =
      auth.currentUser.uid;


    const opponentId =
      Object.keys(
        room.players
      ).find(
        (uid) =>
          uid !== me
      );


    if (!opponentId) {

      setFriendStatus(
        "none"
      );

      return;

    }


    const checkKey =
      `${me}_${opponentId}`;


    if (
      friendStatusChecked.current ===
      checkKey
    ) {
      return;
    }


    friendStatusChecked.current =
      checkKey;


    let cancelled =
      false;


    async function checkStatus() {

      try {

        const status =
          await checkVyloFriendStatus(
            me,
            opponentId!
          );


        if (
          cancelled
        ) {
          return;
        }


        setFriendStatus(
          status
        );

      } catch (error) {

        console.error(
          "Erreur vérification statut VYLO :",
          error
        );


        if (
          !cancelled
        ) {

          setFriendStatus(
            "none"
          );

        }

      }

    }


    checkStatus();


    return () => {

      cancelled =
        true;

    };

  }, [
    room,
  ]);


  /*
  ========================================
  PAIEMENT GAGNANT
  ========================================
  */

  useEffect(() => {

    if (!room) {
      return;
    }


    if (
      room.game?.status !==
      "finished"
    ) {
      return;
    }


    if (
      !room.game?.winner ||
      room.game.winner ===
      "draw"
    ) {
      return;
    }


    if (
      room.game.paymentStatus ===
      "completed"
    ) {
      return;
    }


    if (
      paymentDone.current
    ) {
      return;
    }


    async function pay() {

      try {

        const user =
          auth.currentUser;


        if (!user) {

          throw new Error(
            "Utilisateur non connecté"
          );

        }


        const token =
          await user.getIdToken();


        const res =
          await fetch(
            "/api/game/finish-payment",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  gameId: id,
                }),
            }
          );


        const result =
          await res.json();


        /*
        Si le paiement est déjà en cours ou terminé,
        on considère que c'est un succès (idempotence)
        */

        if (
          res.status === 409 &&
          result?.error === "Paiement déjà traité"
        ) {

          console.log(
            "Paiement déjà traité, ignoré"
          );

          return;

        }


        if (
          !res.ok ||
          !result.success
        ) {

          throw new Error(
            result?.error ||
              "Erreur paiement"
          );

        }


        /*
        Marquer comme terminé uniquement après succès
        */

        paymentDone.current =
          true;


        await addPlayerWin(
          result.winnerUid
        );


        Object.keys(
          room.players || {}
        ).forEach(
          (uid) => {

            if (
              uid !==
              result.winnerUid
            ) {

              addPlayerLose(
                uid
              );

            }

          }
        );


        setTimeout(
          async () => {

            try {

              await remove(
                ref(
                  database,
                  `rooms/${id}`
                )
              );

            } catch (error) {

              console.error(
                "Erreur suppression room :",
                error
              );

            }

          },
          5000
        );


      } catch (error) {

        console.error(
          "PAYMENT ERROR",
          error
        );

        paymentDone.current =
          false;

      }

    }


    pay();


  }, [
    room,
    id,
  ]);


  /*
  ========================================
  JOUER UN COUP
  ========================================
  */

  async function handleMove(
    row: number,
    col: number
  ) {

    if (!mySymbol) {
      return;
    }


    if (
      turn !== mySymbol
    ) {

      setGameMessage(
        "⏳ Ce n'est pas ton tour"
      );


      setTimeout(
        () => {
          setGameMessage("");
        },
        2500
      );


      return;

    }


    try {

      await playGameMove(
        id,
        row,
        col,
        mySymbol
      );

    } catch (error: any) {

      setGameMessage(
        "❌ " +
          (
            error?.message ||
            "Erreur pendant le coup"
          )
      );


      setTimeout(
        () => {
          setGameMessage("");
        },
        2500
      );

    }

  }


  /*
  ========================================
  QUITTER LA PARTIE
  ========================================
  */

  async function handleQuitGame() {
    const user = auth.currentUser;

    if (!user) {
      setGameMessage("❌ Utilisateur non connecté");
      setTimeout(() => setGameMessage(""), 3000);
      return;
    }

    try {
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Erreur quit game:", error);
      setGameMessage("❌ " + (error?.message || "Impossible de quitter la partie"));
      setTimeout(() => setGameMessage(""), 3000);
    } finally {
      setQuitLoading(false);
    }
  }


  /*
  ========================================
  AJOUTER L'ADVERSAIRE COMME AMI VYLO
  ========================================
  */

  async function handleAddFriend() {

    const user =
      auth.currentUser;


    if (!user) {

      setFriendMessage(
        "❌ Utilisateur non connecté"
      );


      setTimeout(
        () => {
          setFriendMessage("");
        },
        3000
      );


      return;

    }


    const opponentId =
      getOpponentId();


    if (!opponentId) {

      setFriendMessage(
        "❌ Adversaire introuvable"
      );


      setTimeout(
        () => {
          setFriendMessage("");
        },
        3000
      );


      return;

    }


    if (
      friendStatus ===
      "friend"
    ) {

      return;

    }


    if (
      friendStatus ===
      "pending"
    ) {

      setFriendMessage(
        "📩 Demande déjà envoyée"
      );


      setTimeout(
        () => {
          setFriendMessage("");
        },
        3000
      );


      return;

    }


    try {

      setFriendLoading(
        true
      );


      setFriendMessage(
        ""
      );


      const currentStatus =
        await checkVyloFriendStatus(
          user.uid,
          opponentId
        );


      if (
        currentStatus ===
        "friend"
      ) {

        setFriendStatus(
          "friend"
        );


        setFriendMessage(
          "✅ Vous êtes déjà amis"
        );


        setTimeout(
          () => {
            setFriendMessage("");
          },
          3000
        );


        return;

      }


      if (
        currentStatus ===
        "pending"
      ) {

        setFriendStatus(
          "pending"
        );


        setFriendMessage(
          "📩 Demande déjà envoyée"
        );


        setTimeout(
          () => {
            setFriendMessage("");
          },
          3000
        );


        return;

      }


      const token = await user.getIdToken(true);

      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: opponentId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi de la demande");
      }


      setFriendStatus(
        "pending"
      );


      setFriendMessage(
        "📩 Demande d'ami envoyée sur VYLO"
      );


    } catch (error: any) {

      console.error(
        "Erreur demande d'ami VYLO :",
        error
      );


      setFriendMessage(
        "❌ " +
          (
            error?.message ||
            "Impossible d'envoyer la demande"
          )
      );


    } finally {

      setFriendLoading(
        false
      );


      setTimeout(
        () => {
          setFriendMessage("");
        },
        3500
      );

    }

  }




  /*
  ========================================
  CHARGEMENT
  ========================================
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
            flex
            flex-col
            items-center
            gap-3
          "
        >

          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-blue-500/20
              bg-blue-500/10
              text-2xl
            "
          >

            🎮

          </div>


          <div
            className="
              text-sm
              font-bold
              text-white/50
            "
          >

            Chargement...

          </div>

        </div>

      </main>

    );

  }


  const user =
    auth.currentUser;


  const bet =
    Number(
      room.bet || 0
    );


  const pot =
    Number(
      room.pot || 0
    );


  const commission =
    Math.floor(
      pot * 0.25
    );


  const reward =
    pot - commission;


  return (

    <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#020617]
        text-white
      "
    >

      {/* DÉCORATION MOBILE */}

      <div
        className="
          pointer-events-none
          fixed
          -left-32
          top-20
          h-64
          w-64
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />


      <div
        className="
          pointer-events-none
          fixed
          -right-32
          bottom-20
          h-64
          w-64
          rounded-full
          bg-cyan-500/10
          blur-3xl
        "
      />


      {/* CONTENEUR PRINCIPAL */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-[430px]
          flex-col
          px-3
          pb-8
          pt-4
        "
      >

        {/* HEADER */}

        <header
          className="
            mb-3
            flex
            items-center
            justify-between
            rounded-2xl
            border
            border-white/[0.07]
            bg-white/[0.025]
            px-3
            py-2.5
            backdrop-blur-xl
          "
        >

          <div
            className="
              min-w-0
              flex-1
            "
          >

            <p
              className="
                truncate
                text-[12px]
                font-black
                text-white
              "
            >

              🎮 {room.name || "TiTaTo"}

            </p>


            <p
              className="
                mt-0.5
                text-[8px]
                font-medium
                text-white/30
              "
            >

              Partie en cours

            </p>

          </div>


          <div
            className="
              ml-3
              shrink-0
              rounded-xl
              border
              border-yellow-400/20
              bg-yellow-500/10
              px-3
              py-1.5
              text-center
            "
          >

            <p
              className="
                text-[7px]
                font-bold
                text-white/35
              "
            >

              POT

            </p>


            <p
              className="
                text-[12px]
                font-black
                text-yellow-400
              "
            >

              {pot.toLocaleString(
                "fr-FR"
              )} HTG

            </p>

          </div>


          <button
            type="button"
            onClick={() => setShowQuitModal(true)}
            className="
              ml-3
              shrink-0
              rounded-xl
              border-2
              border-red-500/40
              bg-gradient-to-br
              from-red-500/20
              to-red-600/10
              px-4
              py-2
              text-center
              transition-all
              duration-300
              hover:scale-105
              hover:border-red-500/60
              hover:from-red-500/30
              hover:to-red-600/20
              hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
              active:scale-95
              animate-pulse
            "
          >

            <p
              className="
                text-[8px]
                font-black
                text-red-400
                tracking-wider
              "
            >

              ⚠️ QUITTER

            </p>

          </button>

        </header>


        {/* INFORMATIONS JOUEUR */}

        <div
          className="
            mb-3
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-white/[0.06]
            bg-white/[0.02]
            px-3
            py-2
          "
        >

          <div
            className="
              text-[10px]
              text-white/45
            "
          >

            Votre symbole

          </div>


          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              border
              border-blue-400/20
              bg-blue-500/10
              text-lg
              font-black
            "
          >

            {mySymbol || "—"}

          </div>

        </div>


        {/* PLATEAU */}

        <div
          className="
            flex
            w-full
            justify-center
          "
        >

          <div
            className="
              w-full
              max-w-[390px]
              overflow-hidden
              rounded-2xl
            "
          >

            <TiTaToBoard
              board={board}
              mySymbol={mySymbol}
              turn={turn}
              winner={winner}
              playMove={handleMove}
            />

          </div>

        </div>


        {/* TIMER */}

        <div
          className="
            mt-3
            flex
            justify-center
          "
        >

          <GameTimer
            turnStartedAt={
              turnStartedAt
            }
            isMyTurn={
              turn === mySymbol
            }
            onTimeout={() => {}}
          />

        </div>


        {/* CHAT */}

        <div
          className="
            mt-3
            w-full
          "
        >

          <GameChat
            roomId={id}
            uid={
              user?.uid || ""
            }
            userName={
              user?.displayName ||
              room.players?.[
                user?.uid || ""
              ]?.name ||
              "Joueur"
            }
          />

        </div>


        {/* MODAL GAGNANT */}

        {
          winner && (

            <WinnerModal
              winner={winner}
              mySymbol={mySymbol}
              reward={reward}
              bet={bet}
              pot={pot}
              commission={commission}
              friendStatus={
                friendStatus
              }
              onAddFriend={
                handleAddFriend
              }
              onClose={() => {
                router.push(
                  "/dashboard"
                );
              }}
            />

          )
        }


        {/* MESSAGE AMI */}

        {
          friendMessage && (

            <div
              className="
                fixed
                bottom-5
                left-1/2
                z-[100]
                w-[calc(100%-24px)]
                max-w-[406px]
                -translate-x-1/2
                rounded-2xl
                border
                border-blue-400/30
                bg-blue-600
                px-4
                py-3
                text-center
                text-xs
                font-bold
                text-white
                shadow-[0_6px_0_rgba(20,70,200,0.7)]
              "
            >

              {friendMessage}

            </div>

          )
        }


        {/* MESSAGE JEU */}

        {
          gameMessage && (

            <div
              className="
                fixed
                bottom-5
                left-1/2
                z-[100]
                w-[calc(100%-24px)]
                max-w-[406px]
                -translate-x-1/2
                rounded-2xl
                border
                border-red-400/30
                bg-red-600
                px-4
                py-3
                text-center
                text-xs
                font-bold
                text-white
                shadow-xl
              "
            >

              {gameMessage}

            </div>

          )
        }


        {/* MESSAGE MATCH NUL */}

        {
          drawMessage && (

            <div
              className="
                fixed
                bottom-5
                left-1/2
                z-[100]
                w-[calc(100%-24px)]
                max-w-[406px]
                -translate-x-1/2
                rounded-2xl
                border
                border-yellow-400/30
                bg-yellow-600
                px-4
                py-3
                text-center
                text-xs
                font-bold
                text-white
                shadow-xl
              "
            >

              🤝 Partie nulle ! Le plateau a été vidé. Continuez à jouer !

            </div>

          )
        }


        {/* MODAL QUITTER LA PARTIE */}

        {showQuitModal && (
          <div
            className="
              fixed
              inset-0
              z-[200]
              flex
              items-center
              justify-center
              bg-black/80
              px-4
            "
          >

            <div
              className="
                w-full
                max-w-[360px]
                rounded-2xl
                border
                border-red-400/30
                bg-[#0a0a0a]
                p-5
                shadow-[0_10px_50px_rgba(0,0,0,0.8)]
              "
            >

              <div
                className="
                  mb-4
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    border-2
                    border-red-400/30
                    bg-red-500/10
                    text-2xl
                  "
                >

                  ⚠️

                </div>

                <h3
                  className="
                    text-[15px]
                    font-black
                    text-white
                  "
                >

                  Quitter la partie ?

                </h3>

                <p
                  className="
                    mt-2
                    text-[10px]
                    text-white/60
                    leading-relaxed
                  "
                >

                  Si vous quittez la partie, vous perdrez votre mise de {room?.bet?.toLocaleString("fr-FR")} HTG. Votre adversaire gagnera automatiquement.

                </p>

              </div>

              <div
                className="
                  flex
                  gap-3
                "
              >

                <button
                  type="button"
                  onClick={() => setShowQuitModal(false)}
                  disabled={quitLoading}
                  className="
                    flex-1
                    rounded-xl
                    border
                    border-white/10
                    bg-white/5
                    px-4
                    py-3
                    text-[11px]
                    font-bold
                    text-white/70
                    transition
                    hover:bg-white/10
                    active:scale-95
                    disabled:opacity-40
                  "
                >

                  Annuler

                </button>

                <button
                  type="button"
                  onClick={handleQuitGame}
                  disabled={quitLoading}
                  className="
                    flex-1
                    rounded-xl
                    border
                    border-red-400/30
                    bg-red-500/20
                    px-4
                    py-3
                    text-[11px]
                    font-bold
                    text-red-400
                    transition
                    hover:bg-red-500/30
                    active:scale-95
                    disabled:opacity-40
                  "
                >

                  {quitLoading ? "Quitter..." : "Quitter"}

                </button>

              </div>

            </div>

          </div>
        )}


        {/* CHARGEMENT DEMANDE AMI */}

        {
          friendLoading && (

            <div
              className="
                pointer-events-none
                fixed
                inset-0
                z-[90]
              "
            />

          )
        }

      </div>

    </main>

  );

}