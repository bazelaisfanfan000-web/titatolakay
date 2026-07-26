"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  onValue,
  ref,
} from "firebase/database";

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
  // AUTH
  // ===================================================

  const [
    user,
    setUser,
  ] = useState<User | null>(null);


  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);


  // ===================================================
  // NOTIFICATIONS
  // ===================================================

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


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


    setLoading(
      true
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
                  value,
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


          setNotifications(
            list
          );


          setLoading(
            false
          );

        },

        (error) => {

          console.error(
            "Erreur notifications :",
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

    } catch {

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

        border:
          "border-green-500/20",

        background:
          "bg-green-500/[0.06]",

        iconBackground:
          "bg-green-500/15",

        iconColor:
          "text-green-400",

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

        border:
          "border-red-500/20",

        background:
          "bg-red-500/[0.06]",

        iconBackground:
          "bg-red-500/15",

        iconColor:
          "text-red-400",

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

        border:
          "border-yellow-500/20",

        background:
          "bg-yellow-500/[0.06]",

        iconBackground:
          "bg-yellow-500/15",

        iconColor:
          "text-yellow-400",

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

        border:
          "border-blue-500/20",

        background:
          "bg-blue-500/[0.06]",

        iconBackground:
          "bg-blue-500/15",

        iconColor:
          "text-blue-400",

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

        border:
          "border-purple-500/20",

        background:
          "bg-purple-500/[0.06]",

        iconBackground:
          "bg-purple-500/15",

        iconColor:
          "text-purple-400",

      };

    }


    return {

      icon:
        "🔔",

      label:
        "Notification",

      border:
        "border-white/[0.07]",

      background:
        "bg-white/[0.025]",

      iconBackground:
        "bg-white/[0.06]",

      iconColor:
        "text-white/70",

    };

  }


  // ===================================================
  // NAVIGATION
  // ===================================================

  function goHome() {

    window.location.href =
      "/dashboard";

  }


  function goWallet() {

    window.location.href =
      "/wallet";

  }


  function goVylo() {

    window.location.href =
      "/vylo";

  }


  // ===================================================
  // CHARGEMENT AUTH
  // ===================================================

  if (
    authLoading
  ) {

    return (

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">

          <div className="text-center">

            <div className="mb-4 text-4xl">
              🔔
            </div>

            <p className="text-xs text-white/40">
              Vérification de votre compte...
            </p>

          </div>

        </div>

      </main>

    );

  }


  // ===================================================
  // PAS CONNECTÉ
  // ===================================================

  if (
    !user
  ) {

    return (

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto w-full max-w-[430px] px-4 pt-12">

          <BackButton />

          <div className="mt-12 rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 text-center">

            <div className="mb-4 text-4xl">
              🔐
            </div>

            <h1 className="text-lg font-black">
              Connexion requise
            </h1>

            <p className="mt-2 text-xs leading-5 text-white/35">
              Connectez-vous pour consulter vos notifications.
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

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">

          <div className="text-center">

            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

            <p className="text-xs text-white/40">
              Chargement des notifications...
            </p>

          </div>

        </div>

      </main>

    );

  }


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <main className="min-h-screen bg-[#030303] text-white">


      {/* =================================
          APP MOBILE
      ================================= */}

      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden bg-[#030303]">


        {/* =================================
            HEADER
        ================================= */}

        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">

          <div className="flex h-[58px] items-center gap-3 px-4">


            <button
              type="button"
              onClick={() => {
                window.history.back();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg transition active:scale-95"
            >
              ←
            </button>


            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-sm shadow-[0_3px_0_rgba(30,100,255,0.25)]">
              🔔
            </div>


            <div className="min-w-0 flex-1">

              <h1 className="text-[15px] font-black">
                Notifications
              </h1>

              <p className="text-[9px] text-white/30">
                Vos activités et résultats
              </p>

            </div>


            {notifications.length > 0 && (

              <div className="flex h-7 min-w-7 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 text-[9px] font-black text-blue-400">

                {notifications.length}

              </div>

            )}

          </div>

        </header>


        {/* =================================
            CONTENU
        ================================= */}

        <div className="px-4 pb-[90px] pt-5">


          {/* =================================
              SALUTATION
          ================================= */}

          <section className="mb-5">

            <h2 className="text-[21px] font-black tracking-tight">
              Salut 👋
            </h2>

            <p className="mt-1 text-[10px] leading-4 text-white/35">
              Retrouvez ici vos dernières activités.
            </p>

          </section>


          {/* =================================
              RÉSUMÉ
          ================================= */}

          <section className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10 text-lg">
                🔔
              </div>


              <div className="min-w-0 flex-1">

                <p className="text-[11px] font-black">
                  Centre de notifications
                </p>

                <p className="mt-1 text-[9px] text-white/30">

                  {notifications.length === 0
                    ? "Vous êtes à jour."
                    : `${notifications.length} notification${notifications.length > 1 ? "s" : ""} disponible${notifications.length > 1 ? "s" : ""}.`
                  }

                </p>

              </div>


              <div className="text-right">

                <p className="text-lg font-black">
                  {notifications.length}
                </p>

                <p className="text-[8px] text-white/25">
                  Total
                </p>

              </div>

            </div>

          </section>


          {/* =================================
              AUCUNE NOTIFICATION
          ================================= */}

          {notifications.length === 0 && (

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-8 text-center">

              <div className="mb-4 text-4xl">
                📭
              </div>

              <h2 className="text-sm font-black">
                Aucune notification
              </h2>

              <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-white/30">
                Vos victoires, défaites, bonus et opérations apparaîtront ici.
              </p>

            </div>

          )}


          {/* =================================
              LISTE NOTIFICATIONS
          ================================= */}

          {notifications.length > 0 && (

            <section>

              <div className="mb-3 flex items-center justify-between">

                <h3 className="text-[13px] font-black">
                  Activité récente
                </h3>

                <span className="text-[9px] text-white/25">

                  {notifications.length} élément
                  {notifications.length > 1
                    ? "s"
                    : ""}

                </span>

              </div>


              <div className="space-y-2.5">

                {notifications.map(
                  (
                    notification
                  ) => {

                    const type =
                      getNotificationType(
                        notification
                      );


                    const date =
                      formatDate(
                        notification.createdAt ||
                        notification.timestamp
                      );


                    return (

                      <div
                        key={
                          notification.id
                        }
                        className={`
                          rounded-2xl
                          border
                          p-3.5
                          ${type.border}
                          ${type.background}
                        `}
                      >

                        <div className="flex items-start gap-3">


                          {/* ICON */}

                          <div
                            className={`
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              text-lg
                              ${type.iconBackground}
                            `}
                          >

                            {type.icon}

                          </div>


                          {/* CONTENU */}

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <div className="min-w-0">

                                <p className="truncate text-[11px] font-black">

                                  {
                                    notification.title ||
                                    type.label
                                  }

                                </p>

                              </div>


                              {notification.amount &&
                                notification.amount > 0 && (

                                  <span className="shrink-0 text-[10px] font-black text-green-400">

                                    +
                                    {notification.amount.toLocaleString(
                                      "fr-FR"
                                    )}
                                    {" "}
                                    HTG

                                  </span>

                                )}

                            </div>


                            <p className="mt-1.5 text-[10px] leading-4 text-white/45">

                              {
                                notification.message ||
                                "Nouvelle notification"
                              }

                            </p>


                            {date && (

                              <p className="mt-2 text-[8px] text-white/20">

                                {date}

                              </p>

                            )}

                          </div>

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          )}


        </div>


        {/* =================================
            NAVIGATION MOBILE
        ================================= */}

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">


          <div className="mx-auto flex h-[62px] w-full max-w-[430px] items-center justify-around px-4">


            {/* ACCUEIL */}

            <button
              type="button"
              onClick={
                goHome
              }
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                🏠
              </span>

              Accueil

            </button>


            {/* PORTEFEUILLE */}

            <button
              type="button"
              onClick={
                goWallet
              }
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                💼
              </span>

              Portefeuille

            </button>


            {/* NOTIFICATIONS - ACTIF */}

            <button
              type="button"
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] font-bold text-blue-400"
            >

              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-[17px] shadow-[0_3px_0_rgba(20,70,200,0.35)]">
                🔔
              </span>

              Notifications

            </button>


            {/* VYLO */}

            <button
              type="button"
              onClick={
                goVylo
              }
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                👥
              </span>

              VYLO

            </button>


          </div>

        </nav>


      </div>

    </main>

  );

}