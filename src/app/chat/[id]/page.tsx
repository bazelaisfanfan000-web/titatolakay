"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  get,
  onValue,
  push,
  ref,
  set,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  markMessagesAsRead,
} from "@/hooks/useUnreadMessages";

import {
  useBlockUser,
  checkIfBlocked,
} from "@/hooks/useBlockUser";


/*
========================================
TYPES
========================================
*/

type UserProfile = {
  uid?: string;
  username?: string;
  email?: string;
  online?: boolean;
  lastSeen?: number;
  language?: string;
};


type Friendship = {
  id?: string;
  userId?: string;
  friendId?: string;
  createdAt?: number;
  status?: string;
};


type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
  readStatus?: "1V" | "2V"; // 1V = non lu, 2V = lu
};


/*
========================================
PAGE CHAT VYLO
========================================
*/

export default function VyloPrivateChatPage() {

  /*
  ======================================
  AUTH
  ======================================
  */

  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(null);


  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);


  /*
  ======================================
  AMI
  ======================================
  */

  const [
    friend,
    setFriend,
  ] = useState<UserProfile | null>(null);


  /*
  ======================================
  STATUT AMITIÉ
  ======================================
  */

  const [
    friendshipLoading,
    setFriendshipLoading,
  ] = useState(true);


  const [
    areFriends,
    setAreFriends,
  ] = useState(false);


  /*
  ======================================
  BLOCAGE
  ======================================
  */

  const { isBlocked, blockUser, unblockUser } = useBlockUser(currentUser?.uid || null);
  const [isUserBlocked, setIsUserBlocked] = useState(false);


  /*
  ======================================
  MESSAGES
  ======================================
  */

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([]);


  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(true);


  /*
  ======================================
  MESSAGE EN COURS
  ======================================
  */

  const [
    messageText,
    setMessageText,
  ] = useState("");


  /*
  ======================================
  ENVOI
  ======================================
  */

  const [
    sending,
    setSending,
  ] = useState(false);


  /*
  ======================================
  ERREUR
  ======================================
  */

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  /*
  ======================================
  REF SCROLL
  ======================================
  */

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);


  /*
  ======================================
  RÉCUPÉRER FRIEND ID
  ======================================
  */

  const friendId =
    useMemo(() => {

      if (
        typeof window ===
        "undefined"
      ) {

        return "";

      }


      const parts =
        window.location.pathname
          .split("/")
          .filter(Boolean);


      return (
        parts[1] ||
        ""
      );

    }, []);


  /*
  ======================================
  ID CHAT
  ======================================
  */

  const chatId =
    useMemo(() => {

      if (
        !currentUser ||
        !friendId
      ) {

        return "";

      }


      return [
        currentUser.uid,
        friendId,
      ]
        .sort()
        .join("_");

    }, [
      currentUser,
      friendId,
    ]);


  /*
  ======================================
  AUTH FIREBASE
  ======================================
  */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          setCurrentUser(
            user
          );

          setAuthLoading(
            false
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  /*
  ======================================
  CHARGER LE PROFIL DE L'AMI
  ======================================
  */

  useEffect(() => {

    if (
      authLoading ||
      !currentUser ||
      !friendId
    ) {

      return;

    }


    async function loadFriend() {

      try {

        setError(null);


        const profileSnapshot =
          await get(
            ref(
              database,
              `users/${friendId}`
            )
          );


        if (
          profileSnapshot.exists()
        ) {

          setFriend({

            uid:
              friendId,

            ...profileSnapshot.val(),

          });

          // Vérifier si l'utilisateur est bloqué
          if (currentUser) {
            const blocked = await checkIfBlocked(currentUser.uid, friendId);
            setIsUserBlocked(blocked);
          }

        } else {

          setError(
            "Utilisateur introuvable."
          );

        }

      } catch (
        profileError
      ) {

        console.error(
          "Erreur chargement profil :",
          profileError
        );


        setError(
          "Impossible de charger le profil de cet utilisateur."
        );

      }

    }


    loadFriend();

  }, [
    authLoading,
    currentUser,
    friendId,
  ]);


  /*
  ======================================
  VÉRIFIER L'AMITIÉ
  ======================================
  */

  useEffect(() => {

    if (
      authLoading ||
      !currentUser ||
      !friendId
    ) {

      return;

    }


    setFriendshipLoading(
      true
    );


    const friendshipRef =
      ref(
        database,
        `vylo/friendships/${currentUser.uid}/${friendId}`
      );


    const unsubscribe =
      onValue(
        friendshipRef,
        (snapshot) => {

          const data =
            snapshot.val() as
              | Friendship
              | null;


          const isFriend =
            Boolean(
              data &&
              data.status ===
                "active"
            );


          setAreFriends(
            isFriend
          );


          setFriendshipLoading(
            false
          );

        },
        (firebaseError) => {

          console.error(
            "Erreur vérification amitié :",
            firebaseError
          );


          setAreFriends(
            false
          );


          setFriendshipLoading(
            false
          );


          setError(
            "Impossible de vérifier votre amitié."
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    authLoading,
    currentUser,
    friendId,
  ]);


  /*
  ======================================
  ÉCOUTER LES MESSAGES
  ======================================
  */

  useEffect(() => {

    if (
      !currentUser ||
      !friendId ||
      !chatId ||
      !areFriends
    ) {

      setMessages([]);

      setMessagesLoading(
        false
      );

      return;

    }


    setMessagesLoading(
      true
    );

    // Marquer les messages comme lus lors de l'ouverture du chat
    markMessagesAsRead(chatId, currentUser.uid);


    const messagesRef =
      ref(
        database,
        `vylo/chats/${chatId}/messages`
      );


    const unsubscribe =
      onValue(
        messagesRef,
        (snapshot) => {

          const data =
            snapshot.val();


          if (
            !data
          ) {

            setMessages([]);

            setMessagesLoading(
              false
            );

            return;

          }


          const result:
            ChatMessage[] = [];


          Object.entries(
            data
          ).forEach(
            ([
              id,
              value,
            ]) => {

              const message =
                value as Partial<ChatMessage>;


              if (
                !message.senderId ||
                !message.receiverId ||
                typeof message.text !==
                  "string"
              ) {

                return;

              }


              result.push({

                id,

                senderId:
                  message.senderId,

                receiverId:
                  message.receiverId,

                text:
                  message.text,

                createdAt:
                  message.createdAt ||
                  0,

                readStatus:
                  message.readStatus ||
                  "1V",

              });

            }
          );


          result.sort(
            (
              a,
              b
            ) =>
              a.createdAt -
              b.createdAt
          );


          setMessages(
            result
          );


          setMessagesLoading(
            false
          );

        },
        (firebaseError) => {

          console.error(
            "Erreur messages VYLO :",
            firebaseError
          );


          setMessages([]);

          setMessagesLoading(
            false
          );


          setError(
            "Impossible de charger les messages."
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    currentUser,
    friendId,
    chatId,
    areFriends,
  ]);


  /*
  ======================================
  SCROLL AUTOMATIQUE
  ======================================
  */

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({

      behavior:
        "smooth",

    });

  }, [
    messages,
  ]);


  /*
  ======================================
  ENVOYER UN MESSAGE
  ======================================
  */

  async function sendMessage() {

    if (
      !currentUser ||
      !friendId ||
      !chatId
    ) {

      return;

    }


    const text =
      messageText.trim();


    if (
      !text
    ) {

      return;

    }


    if (
      !areFriends
    ) {

      setError(
        "Vous devez être amis pour envoyer un message."
      );

      return;

    }


    if (
      sending
    ) {

      return;

    }


    // Vérifier si l'utilisateur est bloqué
    if (isUserBlocked) {
      setError("Vous avez bloqué cet utilisateur.");
      return;
    }


    try {

      setSending(
        true
      );


      setError(
        null
      );


      const messagesRef =
        ref(
          database,
          `vylo/chats/${chatId}/messages`
        );


      const newMessageRef =
        push(
          messagesRef
        );


      const messageId =
        newMessageRef.key;


      if (
        !messageId
      ) {

        throw new Error(
          "Impossible de créer le message."
        );

      }


      const now =
        Date.now();


      const message:
        ChatMessage = {

        id:
          messageId,

        senderId:
          currentUser.uid,

        receiverId:
          friendId,

        text:
          text,

        createdAt:
          now,

        readStatus:
          "1V", // Non lu par défaut

      };


      await set(
        newMessageRef,
        message
      );


      setMessageText(
        ""
      );


    } catch (
      sendError
    ) {

      console.error(
        "Erreur envoi message VYLO :",
        sendError
      );


      setError(
        sendError instanceof Error
          ? sendError.message
          : "Impossible d'envoyer le message."
      );

    } finally {

      setSending(
        false
      );

    }

  }


  /*
  ======================================
  TOUCHE ENTRÉE
  ======================================
  */

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();


      sendMessage();

    }

  }


  /*
  ======================================
  RETOUR VYLO
  ======================================
  */

  function goBack() {

    window.location.href =
      "/vylo";

  }


  /*
  ======================================
  NOM UTILISATEUR
  ======================================
  */

  const username =
    friend?.username ||
    "Utilisateur";


  /*
  ======================================
  AUTH LOADING
  ======================================
  */

  if (
    authLoading
  ) {

    return (

      <main
        className="
          min-h-[100dvh]
          bg-[#020203]
          text-white
        "
      >

        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            px-6
          "
        >

          <div
            className="
              w-full
              max-w-xs
              rounded-3xl
              border
              border-white/[0.06]
              bg-white/[0.025]
              px-6
              py-8
              text-center
              shadow-2xl
            "
          >

            <div
              className="
                mx-auto
                mb-5
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                border
                border-blue-500/20
                bg-blue-600/10
                text-3xl
              "
            >
              💙
            </div>


            <h1
              className="
                text-base
                font-black
              "
            >
              VYLO
            </h1>


            <p
              className="
                mt-2
                text-xs
                text-white/35
              "
            >
              Chargement de votre messagerie...
            </p>


            <div
              className="
                mx-auto
                mt-5
                h-1
                w-20
                overflow-hidden
                rounded-full
                bg-white/10
              "
            >

              <div
                className="
                  h-full
                  w-1/2
                  animate-pulse
                  rounded-full
                  bg-blue-500
                "
              />

            </div>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  PAS CONNECTÉ
  ======================================
  */

  if (
    !currentUser
  ) {

    return (

      <main
        className="
          min-h-[100dvh]
          bg-[#020203]
          text-white
        "
      >

        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            px-5
          "
        >

          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              p-7
              text-center
              shadow-2xl
            "
          >

            <div
              className="
                mx-auto
                mb-5
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
                text-3xl
              "
            >
              🔐
            </div>


            <h1
              className="
                text-xl
                font-black
              "
            >
              Connexion requise
            </h1>


            <p
              className="
                mx-auto
                mt-3
                max-w-xs
                text-xs
                leading-5
                text-white/40
              "
            >
              Connectez-vous à votre compte pour accéder à votre messagerie privée VYLO.
            </p>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  AMI INVALIDE
  ======================================
  */

  if (
    !friendId
  ) {

    return (

      <main
        className="
          min-h-[100dvh]
          bg-[#020203]
          text-white
        "
      >

        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            px-5
          "
        >

          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              p-7
              text-center
              shadow-2xl
            "
          >

            <div
              className="
                mx-auto
                mb-5
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                border
                border-yellow-500/20
                bg-yellow-500/10
                text-3xl
              "
            >
              ⚠️
            </div>


            <h1
              className="
                text-xl
                font-black
              "
            >
              Utilisateur introuvable
            </h1>


            <p
              className="
                mt-3
                text-xs
                leading-5
                text-white/40
              "
            >
              Cette conversation ne peut pas être ouverte.
            </p>


            <button
              type="button"
              onClick={
                goBack
              }
              className="
                mt-6
                h-12
                w-full
                rounded-2xl
                bg-blue-600
                text-sm
                font-black
                shadow-[0_5px_0_rgba(20,70,200,0.65)]
                transition
                hover:bg-blue-500
                active:translate-y-[3px]
                active:shadow-none
              "
            >
              ← Retour à VYLO
            </button>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  VÉRIFICATION AMITIÉ
  ======================================
  */

  if (
    friendshipLoading
  ) {

    return (

      <main
        className="
          min-h-[100dvh]
          bg-[#020203]
          text-white
        "
      >

        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            px-5
          "
        >

          <div
            className="
              text-center
            "
          >

            <div
              className="
                mx-auto
                mb-5
                h-10
                w-10
                animate-spin
                rounded-full
                border-2
                border-white/10
                border-t-blue-500
              "
            />


            <p
              className="
                text-xs
                font-semibold
                text-white/40
              "
            >
              Vérification de votre amitié...
            </p>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  PAS AMIS
  ======================================
  */

  if (
    !areFriends
  ) {

    return (

      <main
        className="
          min-h-[100dvh]
          bg-[#020203]
          text-white
        "
      >

        <header
          className="
            fixed
            left-0
            right-0
            top-0
            z-50
            border-b
            border-white/[0.06]
            bg-[#020203]/90
            backdrop-blur-2xl
          "
        >

          <div
            className="
              mx-auto
              flex
              h-16
              w-full
              max-w-xl
              items-center
              gap-3
              px-4
            "
          >

            <button
              type="button"
              onClick={
                goBack
              }
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/10
                bg-white/[0.04]
                text-lg
                transition
                active:scale-90
              "
            >
              ←
            </button>


            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-600/10
                text-lg
              "
            >
              💬
            </div>


            <div
              className="
                min-w-0
              "
            >

              <h1
                className="
                  text-sm
                  font-black
                "
              >
                VYLO
              </h1>


              <p
                className="
                  text-[10px]
                  text-white/30
                "
              >
                Messagerie privée
              </p>

            </div>

          </div>

        </header>


        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            px-5
            pt-16
          "
        >

          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              p-7
              text-center
              shadow-2xl
            "
          >

            <div
              className="
                mx-auto
                mb-5
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-3xl
                border
                border-white/10
                bg-white/[0.04]
                text-4xl
              "
            >
              🔒
            </div>


            <h2
              className="
                text-xl
                font-black
              "
            >
              Conversation indisponible
            </h2>


            <p
              className="
                mt-3
                text-xs
                leading-5
                text-white/40
              "
            >
              Vous devez être amis avec cet utilisateur pour discuter sur VYLO.
            </p>


            <button
              type="button"
              onClick={
                goBack
              }
              className="
                mt-7
                h-12
                w-full
                rounded-2xl
                bg-blue-600
                text-sm
                font-black
                shadow-[0_5px_0_rgba(20,70,200,0.65)]
                transition
                hover:bg-blue-500
                active:translate-y-[3px]
                active:shadow-none
              "
            >
              ← Retour à mes amis
            </button>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  INTERFACE CHAT
  ======================================
  */

  return (

    <main
      className="
        flex
        h-[100dvh]
        min-h-[100dvh]
        flex-col
        overflow-hidden
        bg-[#020203]
        text-white
      "
    >


      {/* =================================
          HEADER MOBILE
      ================================= */}

      <header
        className="
          z-50
          shrink-0
          border-b
          border-white/[0.07]
          bg-[#030304]/95
          backdrop-blur-2xl
          supports-[backdrop-filter]:bg-[#030304]/75
        "
      >

        <div
          className="
            mx-auto
            flex
            h-[64px]
            w-full
            max-w-2xl
            items-center
            gap-3
            px-3
            sm:px-4
          "
        >

          {/* RETOUR */}

          <button
            type="button"
            onClick={
              goBack
            }
            aria-label="Retour"
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/[0.04]
              text-lg
              transition
              hover:bg-white/[0.08]
              active:scale-90
            "
          >
            ←
          </button>


          {/* AVATAR */}

          <div
            className="
              relative
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-blue-500/25
              bg-gradient-to-br
              from-blue-600/25
              to-blue-900/10
              text-sm
              font-black
              text-blue-200
              shadow-inner
            "
          >

            {username
              .charAt(0)
              .toUpperCase()}


            {friend?.online && (

              <span
                className="
                  absolute
                  -bottom-0.5
                  -right-0.5
                  h-3.5
                  w-3.5
                  rounded-full
                  border-2
                  border-[#030304]
                  bg-green-500
                  shadow-[0_0_10px_rgba(34,197,94,0.7)]
                "
              />

            )}

          </div>


          {/* PROFIL */}

          <div
            className="
              min-w-0
              flex-1
            "
          >

            <p
              className="
                truncate
                text-sm
                font-black
                text-white
              "
            >
              {username}
            </p>


            <p
              className="
                mt-0.5
                truncate
                text-[10px]
                font-medium
                text-white/35
              "
            >

              {friend?.online
                ? "● En ligne"
                : "○ Hors ligne"}

            </p>

          </div>


          {/* INDICATEUR VYLO */}

          <div
            className="
              hidden
              rounded-xl
              border
              border-blue-500/15
              bg-blue-500/5
              px-3
              py-2
              text-[9px]
              font-black
              text-blue-300/70
              sm:block
            "
          >
            VYLO
          </div>

          {/* BOUTON BLOCAGE */}
          <button
            type="button"
            onClick={async () => {
              if (isUserBlocked) {
                await unblockUser(friendId);
                setIsUserBlocked(false);
              } else {
                await blockUser(friendId);
                setIsUserBlocked(true);
              }
            }}
            className="
              ml-2
              rounded-lg
              border
              px-2
              py-1.5
              text-[9px]
              font-black
              transition
              active:scale-95
              sm:ml-3
            "
            style={{
              borderColor: isUserBlocked ? "#22c55e" : "#ef4444",
              backgroundColor: isUserBlocked ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: isUserBlocked ? "#22c55e" : "#ef4444",
            }}
          >
            {isUserBlocked ? "🔓 Débloquer" : "🚫 Bloquer"}
          </button>

        </div>

      </header>


      {/* =================================
          ZONE MESSAGES
      ================================= */}

      <div
        className="
          mx-auto
          flex
          w-full
          max-w-2xl
          min-h-0
          flex-1
          flex-col
          overflow-hidden
        "
      >

        <div
          className="
            flex-1
            overflow-y-auto
            overscroll-contain
            px-3
            py-4
            sm:px-4
            sm:py-6
          "
        >

          {messagesLoading ? (

            <div
              className="
                flex
                h-full
                min-h-[250px]
                items-center
                justify-center
              "
            >

              <div
                className="
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    mb-4
                    h-8
                    w-8
                    animate-spin
                    rounded-full
                    border-2
                    border-white/10
                    border-t-blue-500
                  "
                />


                <p
                  className="
                    text-[10px]
                    text-white/30
                  "
                >
                  Chargement des messages...
                </p>

              </div>

            </div>

          ) : messages.length === 0 ? (

            <div
              className="
                flex
                h-full
                min-h-[350px]
                items-center
                justify-center
              "
            >

              <div
                className="
                  w-full
                  max-w-xs
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    mb-5
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-3xl
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    text-3xl
                  "
                >
                  💬
                </div>


                <h2
                  className="
                    text-base
                    font-black
                  "
                >
                  Aucun message
                </h2>


                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-white/30
                  "
                >
                  Commencez une nouvelle conversation avec {username}.
                </p>

              </div>

            </div>

          ) : (

            <div
              className="
                mx-auto
                w-full
                space-y-3
              "
            >

              {messages.map(
                (
                  message
                ) => {

                  const isMine =
                    message.senderId ===
                    currentUser.uid;


                  const time =
                    new Date(
                      message.createdAt
                    ).toLocaleTimeString(
                      "fr-FR",
                      {
                        hour:
                          "2-digit",

                        minute:
                          "2-digit",

                      }
                    );


                  return (

                    <div
                      key={
                        message.id
                      }
                      className={`
                        flex
                        w-full
                        ${
                          isMine
                            ? "justify-end"
                            : "justify-start"
                        }
                      `}
                    >

                      <div
                        className={`
                          flex
                          max-w-[85%]
                          flex-col
                          sm:max-w-[70%]
                          ${
                            isMine
                              ? "items-end"
                              : "items-start"
                          }
                        `}
                      >

                        <div
                          className={`
                            break-words
                            rounded-[20px]
                            px-4
                            py-3
                            text-[13px]
                            leading-5
                            shadow-sm
                            ${
                              isMine
                                ? "rounded-br-md bg-blue-600 text-white shadow-blue-950/30"
                                : "rounded-bl-md border border-white/[0.07] bg-white/[0.055] text-white/90"
                            }
                          `}
                        >

                          {message.text}

                        </div>


                        <span
                          className="
                            mt-1
                            px-1
                            text-[9px]
                            font-medium
                            text-white/20
                          "
                        >
                          {time}
                        </span>

                      </div>

                    </div>

                  );

                }
              )}


              <div
                ref={
                  messagesEndRef
                }
              />

            </div>

          )}

        </div>


        {/* =================================
            ERREUR
        ================================= */}

        {error && (

          <div
            className="
              shrink-0
              px-3
              pb-2
              sm:px-4
            "
          >

            <div
              className="
                mx-auto
                max-w-2xl
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/10
                px-4
                py-3
                text-xs
                font-semibold
                leading-5
                text-red-300
              "
            >

              {error}

            </div>

          </div>

        )}


        {/* =================================
            COMPOSER MOBILE
        ================================= */}

        <div
          className="
            shrink-0
            border-t
            border-white/[0.07]
            bg-[#030304]/95
            p-3
            pb-[max(12px,env(safe-area-inset-bottom))]
            backdrop-blur-2xl
            supports-[backdrop-filter]:bg-[#030304]/80
            sm:px-4
            sm:py-4
          "
        >

          <div
            className="
              mx-auto
              flex
              w-full
              max-w-2xl
              items-end
              gap-2
            "
          >

            <div
              className="
                relative
                min-w-0
                flex-1
              "
            >

              <input
                type="text"
                value={
                  messageText
                }
                onChange={(
                  event
                ) =>
                  setMessageText(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Écrire un message..."
                maxLength={
                  1000
                }
                disabled={
                  sending
                }
                className="
                  h-12
                  w-full
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.045]
                  px-4
                  text-sm
                  text-white
                  outline-none
                  transition
                  placeholder:text-white/20
                  focus:border-blue-500/40
                  focus:bg-white/[0.06]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />

            </div>


            <button
              type="button"
              onClick={
                sendMessage
              }
              disabled={
                sending ||
                !messageText.trim()
              }
              aria-label="Envoyer le message"
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-blue-600
                text-lg
                font-black
                text-white
                shadow-[0_5px_0_rgba(20,70,200,0.65)]
                transition
                hover:bg-blue-500
                active:translate-y-[3px]
                active:shadow-none
                disabled:cursor-not-allowed
                disabled:opacity-35
                disabled:shadow-none
              "
            >

              {sending
                ? (
                  <span
                    className="
                      text-sm
                      animate-pulse
                    "
                  >
                    ...
                  </span>
                )
                : "➤"}

            </button>

          </div>

        </div>

      </div>

    </main>

  );

}