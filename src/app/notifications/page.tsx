"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onValue,
  ref,
} from "firebase/database";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import {
  auth,
  database,
} from "@/lib/firebase";

import BackButton from "@/components/BackButton";


// =====================================================
// TYPE NOTIFICATION
// =====================================================

type NotificationItem = {

  id: string;

  title?: string;

  message?: string;

  type?: string;

  amount?: number;

  createdAt?: number;

  timestamp?: number;

  read?: boolean;

};


// =====================================================
// PAGE NOTIFICATIONS
// =====================================================

export default function NotificationsPage() {


  // ===================================================
  // STATES
  // ===================================================

  const [
    user,
    setUser
  ] =
    useState<User | null>(
      null
    );


  const [
    notifications,
    setNotifications
  ] =
    useState<NotificationItem[]>([]);


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    authLoading,
    setAuthLoading
  ] =
    useState(true
    );


  // ===================================================
  // AUTHENTIFICATION
  // ===================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          setUser(
            currentUser
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


  // ===================================================
  // CHARGER LES NOTIFICATIONS
  // ===================================================

  useEffect(() => {

    if (
      authLoading
    ) {

      return;

    }


    if (
      !user
    ) {

      setNotifications([]);

      setLoading(
        false
      );

      return;

    }


    console.log(
      "[NOTIFICATIONS] Chargement pour:",
      user.uid
    );


    const notificationsRef =
      ref(
        database,
        `notifications/${user.uid}`
      );


    const unsubscribe =
      onValue(

        notificationsRef,

        (snapshot) => {

          console.log(
            "[NOTIFICATIONS] Snapshot:",
            snapshot.exists()
          );


          if (
            !snapshot.exists()
          ) {

            setNotifications([]);

            setLoading(
              false
            );

            return;

          }


          const data =
            snapshot.val();


          const list:
            NotificationItem[] =
            Object.entries(
              data
            )
            .map(
              (
                [
                  id,
                  value
                ]
              ) => {

                const notification =
                  value as any;


                return {

                  id,

                  title:
                    notification?.title ||
                    "Notification",

                  message:
                    notification?.message ||
                    "",

                  type:
                    notification?.type ||
                    "info",

                  amount:
                    Number(
                      notification?.amount ||
                      0
                    ),

                  createdAt:
                    Number(
                      notification?.createdAt ||
                      notification?.timestamp ||
                      0
                    ),

                  timestamp:
                    Number(
                      notification?.timestamp ||
                      notification?.createdAt ||
                      0
                    ),

                  read:
                    Boolean(
                      notification?.read ||
                      false
                    ),

                };

              }
            )
            .sort(
              (
                a,
                b
              ) =>
                (
                  b.createdAt ||
                  b.timestamp ||
                  0
                )
                -
                (
                  a.createdAt ||
                  a.timestamp ||
                  0
                )
            );


          console.log(
            "[NOTIFICATIONS] Liste:",
            list
          );


          setNotifications(
            list
          );


          setLoading(
            false
          );

        },

        (error) => {

          console.error(
            "[NOTIFICATIONS] ERREUR:",
            error
          );


          setNotifications([]);

          setLoading(
            false
          );

        }

      );


    return () => {

      unsubscribe();

    };


  }, [
    user,
    authLoading,
  ]);



  // ===================================================
  // FORMAT DATE
  // ===================================================

  function formatDate(
    timestamp?: number
  ) {

    if (
      !timestamp
    ) {

      return "";

    }


    try {

      return new Date(
        timestamp
      ).toLocaleString(
        "fr-FR",
        {
          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );

    }
    catch {

      return "";

    }

  }



  // ===================================================
  // TYPE NOTIFICATION
  // ===================================================

  function getNotificationType(
    notification: NotificationItem
  ) {

    const type =
      String(
        notification.type ||
        ""
      ).toLowerCase();


    if (
      type === "win" ||
      type === "game_win" ||
      type === "victory"
    ) {

      return {

        icon:
          "🏆",

        label:
          "Victoire",

        className:
          "border-green-500/30 bg-green-500/10",

        iconClass:
          "bg-green-500/20",

      };

    }


    if (
      type === "lose" ||
      type === "game_lose" ||
      type === "loss"
    ) {

      return {

        icon:
          "😢",

        label:
          "Défaite",

        className:
          "border-red-500/30 bg-red-500/10",

        iconClass:
          "bg-red-500/20",

      };

    }


    if (
      type === "bonus" ||
      type === "reward" ||
      type === "welcome_bonus"
    ) {

      return {

        icon:
          "🎁",

        label:
          "Bonus",

        className:
          "border-yellow-500/30 bg-yellow-500/10",

        iconClass:
          "bg-yellow-500/20",

      };

    }


    if (
      type === "deposit"
    ) {

      return {

        icon:
          "💰",

        label:
          "Dépôt",

        className:
          "border-blue-500/30 bg-blue-500/10",

        iconClass:
          "bg-blue-500/20",

      };

    }


    if (
      type === "withdraw" ||
      type === "withdrawal"
    ) {

      return {

        icon:
          "💸",

        label:
          "Retrait",

        className:
          "border-purple-500/30 bg-purple-500/10",

        iconClass:
          "bg-purple-500/20",

      };

    }


    return {

      icon:
        "🔔",

      label:
        "Notification",

      className:
        "border-white/10 bg-white/5",

      iconClass:
        "bg-white/10",

    };

  }



  // ===================================================
  // CHARGEMENT AUTH
  // ===================================================

  if (
    authLoading
  ) {

    return (

      <main
        className="
          min-h-screen
          bg-gradient-to-br
          from-[#020617]
          via-[#07152f]
          to-black
          text-white
          flex
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
              text-5xl
              mb-4
            "
          >

            🔔

          </div>


          <p
            className="
              font-bold
              text-gray-300
            "
          >

            Vérification de votre compte...

          </p>

        </div>

      </main>

    );

  }



  // ===================================================
  // NON CONNECTÉ
  // ===================================================

  if (
    !user
  ) {

    return (

      <main
        className="
          min-h-screen
          bg-gradient-to-br
          from-[#020617]
          via-[#07152f]
          to-black
          text-white
          px-4
          py-8
        "
      >

        <div
          className="
            mx-auto
            max-w-md
          "
        >

          <BackButton />


          <div
            className="
              mt-12
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-8
              text-center
              backdrop-blur-xl
            "
          >

            <div
              className="
                text-5xl
                mb-4
              "
            >

              🔐

            </div>


            <h1
              className="
                text-xl
                font-black
                mb-3
              "
            >

              Connexion requise

            </h1>


            <p
              className="
                text-sm
                text-gray-400
              "
            >

              Connectez-vous pour consulter
              vos notifications.

            </p>

          </div>

        </div>

      </main>

    );

  }



  // ===================================================
  // CHARGEMENT NOTIFICATIONS
  // ===================================================

  if (
    loading
  ) {

    return (

      <main
        className="
          min-h-screen
          bg-gradient-to-br
          from-[#020617]
          via-[#07152f]
          to-black
          text-white
          flex
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
              text-5xl
              mb-4
            "
          >

            🔔

          </div>


          <p
            className="
              font-bold
              text-gray-300
            "
          >

            Chargement des notifications...

          </p>

        </div>

      </main>

    );

  }



  // ===================================================
  // RENDER
  // ===================================================

  return (

    <main
      className="
        min-h-screen
        bg-gradient-to-br
        from-[#020617]
        via-[#07152f]
        to-black
        text-white
        px-4
        py-8
      "
    >

      <div
        className="
          mx-auto
          max-w-md
        "
      >


        {/* ========================================= */}
        {/* RETOUR */}
        {/* ========================================= */}

        <BackButton />


        {/* ========================================= */}
        {/* TITRE */}
        {/* ========================================= */}

        <div
          className="
            mt-6
            mb-8
            text-center
          "
        >

          <div
            className="
              text-5xl
              mb-3
            "
          >

            🔔

          </div>


          <h1
            className="
              text-3xl
              font-black
              bg-gradient-to-r
              from-blue-400
              to-cyan-300
              bg-clip-text
              text-transparent
            "
          >

            Notifications

          </h1>


          <p
            className="
              mt-2
              text-sm
              text-gray-400
            "
          >

            Vos bonus et résultats de parties

          </p>

        </div>



        {/* ========================================= */}
        {/* COMPTEUR */}
        {/* ========================================= */}

        <div
          className="
            mb-5
            rounded-2xl
            border
            border-white/10
            bg-white/5
            p-4
            text-center
            backdrop-blur-xl
          "
        >

          <span
            className="
              text-gray-400
              text-sm
            "
          >

            Total des notifications

          </span>


          <div
            className="
              mt-1
              text-2xl
              font-black
            "
          >

            {notifications.length}

          </div>

        </div>



        {/* ========================================= */}
        {/* LISTE VIDE */}
        {/* ========================================= */}

        {
          notifications.length === 0 && (

            <div
              className="
                rounded-3xl
                border
                border-white/10
                bg-white/5
                p-10
                text-center
                backdrop-blur-xl
              "
            >

              <div
                className="
                  text-6xl
                  mb-5
                "
              >

                📭

              </div>


              <h2
                className="
                  text-xl
                  font-black
                  mb-2
                "
              >

                Aucune notification

              </h2>


              <p
                className="
                  text-sm
                  text-gray-400
                  leading-6
                "
              >

                Vos victoires, défaites et bonus
                apparaîtront ici.

              </p>

            </div>

          )
        }



        {/* ========================================= */}
        {/* LISTE */}
        {/* ========================================= */}

        <div
          className="
            space-y-4
          "
        >

          {
            notifications.map(
              (
                notification
              ) => {

                const type =
                  getNotificationType(
                    notification
                  );


                return (

                  <div
                    key={
                      notification.id
                    }
                    className={`
                      rounded-3xl
                      border
                      p-5
                      backdrop-blur-xl
                      shadow-xl
                      ${type.className}
                    `}
                  >

                    <div
                      className="
                        flex
                        items-start
                        gap-4
                      "
                    >


                      {/* ICON */}

                      <div
                        className={`
                          flex
                          h-14
                          w-14
                          shrink-0
                          items-center
                          justify-center
                          rounded-2xl
                          text-3xl
                          ${type.iconClass}
                        `}
                      >

                        {type.icon}

                      </div>



                      {/* CONTENU */}

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >

                          <h2
                            className="
                              font-black
                              text-base
                            "
                          >

                            {
                              notification.title ||
                              type.label
                            }

                          </h2>


                          {
                            notification.amount &&
                            notification.amount > 0 && (

                              <span
                                className="
                                  shrink-0
                                  font-black
                                  text-green-400
                                "
                              >

                                +
                                {
                                  notification.amount
                                }
                                {" "}HTG

                              </span>

                            )
                          }

                        </div>



                        <p
                          className="
                            mt-2
                            text-sm
                            leading-6
                            text-gray-300
                          "
                        >

                          {
                            notification.message ||
                            "Nouvelle notification"
                          }

                        </p>



                        <p
                          className="
                            mt-3
                            text-xs
                            text-gray-500
                          "
                        >

                          {
                            formatDate(
                              notification.createdAt ||
                              notification.timestamp
                            )
                          }

                        </p>

                      </div>

                    </div>

                  </div>

                );

              }
            )

          }

        </div>

      </div>

    </main>

  );

}