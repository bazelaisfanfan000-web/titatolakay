"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  onValue,
  ref,
} from "firebase/database";

import { useNotifications } from "@/hooks/useNotifications";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";
import { Bell } from "lucide-react";


/*
====================================================
DASHBOARD TITATO
====================================================
*/

export default function Dashboard() {

  const router = useRouter();

  // Initialiser les notifications
  useNotifications();
  useForegroundNotifications();


  /*
  ==================================================
  STATES
  ==================================================
  */

  const [
    balance,
    setBalance,
  ] = useState(0);


  const [
    balanceLoading,
    setBalanceLoading,
  ] = useState(true);


  const [
    username,
    setUsername,
  ] = useState("Joueur");




  const [
    stats,
    setStats,
  ] = useState({
    wins: 0,
    games: 0,
  });

  const [notificationPermission, setNotificationPermission] = useState<"granted" | "denied" | "default" | "prompt">("default");

  // Demander la permission de notification au chargement
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Demander la permission de notification
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        // Enregistrer le service worker
        try {
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("Service Worker enregistré:", registration);
          }
        } catch (swError) {
          console.error("Erreur enregistrement SW:", swError);
        }
      }
      return permission === "granted";
    }
    return false;
  };


  /*
  ==================================================
  TAUX DE VICTOIRE
  ==================================================
  */

  const winRate =
    stats.games > 0
      ? Math.round(
          (stats.wins / stats.games) * 100
        )
      : 0;


  /*
  ==================================================
  AUTH + DONNÉES FIREBASE
  ==================================================
  */

  useEffect(() => {

    let unsubscribeUser:
      (() => void) | null = null;


    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {

          if (!user) {

            setBalance(0);

            setBalanceLoading(false);

            router.push("/login");

            return;

          }


          /*
          ==========================================
          PROFIL UTILISATEUR
          ==========================================
          */

          const userRef =
            ref(
              database,
              `users/${user.uid}`
            );


          unsubscribeUser =
            onValue(
              userRef,
              (snapshot) => {

                const data =
                  snapshot.val();


                if (!data) {

                  setUsername(
                    "Joueur"
                  );

                  setBalance(0);

                  setStats({
                    wins: 0,
                    games: 0,
                  });

                  setBalanceLoading(
                    false
                  );

                  return;

                }


                const firebaseBalance =
                  Number(
                    data.balance ?? 0
                  );


                setBalance(
                  Number.isFinite(
                    firebaseBalance
                  )
                    ? firebaseBalance
                    : 0
                );


                setBalanceLoading(
                  false
                );


                setUsername(
                  data.username ||
                  "Joueur"
                );


                setStats({

                  wins:
                    Number(
                      data.wins || 0
                    ),

                  games:
                    Number(
                      data.gamesPlayed || 0
                    ),

                });

              },

              (error) => {

                console.error(
                  "Erreur lecture profil Firebase:",
                  error
                );

                setBalance(0);

                setBalanceLoading(
                  false
                );

              }
            );



        }
      );


    /*
    ==============================================
    CLEANUP
    ==============================================
    */

    return () => {

      unsubscribeAuth();


      if (
        unsubscribeUser
      ) {

        unsubscribeUser();

      }

    };

  }, [
    router,
  ]);


  /*
  ==================================================
  DASHBOARD
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
          DÉCORATIONS
      ========================================== */}

      <div
        className="
          pointer-events-none
          fixed
          -left-24
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
          mx-auto
          min-h-screen
          w-full
          max-w-[430px]
          overflow-x-hidden
          pb-28
        "
      >


        {/* ========================================
            HEADER FIXE
        ======================================== */}

        <header
          className="
            fixed
            left-0
            right-0
            top-0
            z-50
            border-b
            border-white/[0.08]
            bg-[#020617]/95
            backdrop-blur-2xl
          "
        >

          <div
            className="
              mx-auto
              flex
              h-[64px]
              w-full
              max-w-[430px]
              items-center
              justify-between
              px-4
            "
          >

            {/* LOGO */}

            <div
              className="
                flex
                min-w-0
                flex-col
                justify-center
              "
            >

              <h1
                className="
                  text-[17px]
                  font-black
                  leading-none
                  tracking-tight
                  text-white
                "
              >

                TiTaTo

              </h1>


              <p
                className="
                  mt-1
                  text-[8px]
                  font-medium
                  leading-none
                  text-white/35
                "
              >

                Jouez. Défilez. Gagnez.

              </p>

            </div>


            {/* SOLDE */}

            <button
              type="button"
              onClick={() =>
                router.push("/wallet")
              }
              className="
                flex
                h-[38px]
                min-w-[92px]
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-blue-400/30
                bg-blue-500/[0.10]
                px-3
                text-center
                shadow-[0_3px_0_rgba(30,64,175,0.65),0_0_15px_rgba(37,99,235,0.08)]
                backdrop-blur-md
                transition-all
                hover:border-blue-300/50
                hover:bg-blue-500/[0.16]
                active:translate-y-[2px]
                active:shadow-none
              "
            >

              <span
                className="
                  text-[14px]
                  leading-none
                "
              >

                💰

              </span>


              <span
                className="
                  whitespace-nowrap
                  text-[10px]
                  font-bold
                  text-blue-100
                "
              >

                Portefeuille

              </span>

            </button>

            {/* PARRAINAGE */}

            <button
              type="button"
              onClick={() =>
                router.push("/referral")
              }
              className="
                flex
                h-[38px]
                min-w-[92px]
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-green-400/30
                bg-green-500/[0.10]
                px-3
                text-center
                shadow-[0_3px_0_rgba(34,197,94,0.65),0_0_15px_rgba(34,197,94,0.08)]
                backdrop-blur-md
                transition-all
                hover:border-green-300/50
                hover:bg-green-500/[0.16]
                active:translate-y-[2px]
                active:shadow-none
              "
            >

              <span
                className="
                  text-[14px]
                  leading-none
                "
              >

                🎁

              </span>


              <span
                className="
                  whitespace-nowrap
                  text-[10px]
                  font-bold
                  text-green-100
                "
              >

                Parrainage

              </span>

            </button>

          </div>

        </header>


        {/* ========================================
            CONTENU
        ======================================== */}

        <div
          className="
            px-4
            pb-10
            pt-[88px]
          "
        >


          {/* ======================================
              SALUTATION
          ====================================== */}

          <section>

            <p
              className="
                text-[10px]
                font-medium
                text-white/35
              "
            >

              Salut 👋

            </p>


            <h2
              className="
                mt-1
                text-[23px]
                font-black
                tracking-tight
              "
            >

              {username}

            </h2>

          </section>


          {/* ======================================
              STATISTIQUES
          ====================================== */}

          <section
            className="
              mt-5
              grid
              grid-cols-3
              overflow-hidden
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.025]
            "
          >

            {/* VICTOIRES */}

            <div
              className="
                border-r
                border-white/[0.06]
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                🏆

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                "
              >

                {stats.wins}

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Victoires

              </p>

            </div>


            {/* TAUX */}

            <div
              className="
                border-r
                border-white/[0.06]
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                📈

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                  text-green-400
                "
              >

                {winRate}%

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Taux de victoire

              </p>

            </div>


            {/* PARTIES */}

            <div
              className="
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                🎮

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                "
              >

                {stats.games}

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Parties

              </p>

            </div>

          </section>


          {/* ======================================
              ACTIONS
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                space-y-2.5
              "
            >

              {/* CRÉER UNE PARTIE */}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/create-room"
                  )
                }
                className="
                  flex
                  min-h-[68px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-blue-400/30
                  bg-blue-500/[0.10]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(30,64,175,0.65),0_0_18px_rgba(37,99,235,0.08)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/50
                  hover:bg-blue-500/[0.16]
                  hover:shadow-[0_5px_0_rgba(30,64,175,0.7),0_0_24px_rgba(37,99,235,0.14)]
                  active:translate-y-[3px]
                  active:shadow-none
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-300/25
                    bg-blue-400/[0.10]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  "
                >

                  🎮

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-blue-100
                    "
                  >

                    Créer une partie

                  </h4>


                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-blue-100/40
                    "
                  >

                    Lancez votre propre défi.

                  </p>

                </div>


                <span
                  className="
                    shrink-0
                    pr-1
                    text-2xl
                    font-light
                    leading-none
                    text-blue-200/50
                  "
                >

                  ›

                </span>

              </button>


              {/* REJOINDRE UNE PARTIE */}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/join-room"
                  )
                }
                className="
                  flex
                  min-h-[68px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-blue-400/25
                  bg-blue-500/[0.07]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(30,64,175,0.5),0_0_15px_rgba(37,99,235,0.06)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/45
                  hover:bg-blue-500/[0.12]
                  hover:shadow-[0_5px_0_rgba(30,64,175,0.6),0_0_22px_rgba(37,99,235,0.1)]
                  active:translate-y-[3px]
                  active:shadow-none
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-300/20
                    bg-blue-400/[0.07]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
                  "
                >

                  🚀

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-blue-100
                    "
                  >

                    Rejoindre une partie

                  </h4>


                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-blue-100/35
                    "
                  >

                    Trouvez une partie disponible.

                  </p>

                </div>


                <span
                  className="
                    shrink-0
                    pr-1
                    text-2xl
                    font-light
                    leading-none
                    text-blue-200/50
                  "
                >

                  ›

                </span>

              </button>

            </div>

          </section>

          {/* ======================================
              NOTIFICATIONS
          ====================================== */}

          <section
            className="
              mt-6
            "
          >
            {notificationPermission === "default" && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="
                  flex
                  min-h-[56px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-green-400/30
                  bg-green-500/[0.10]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(34,197,94,0.65),0_0_18px_rgba(34,197,94,0.08)]
                  backdrop-blur-md
                  transition-all
                  hover:border-green-300/50
                  hover:bg-green-500/[0.16]
                  hover:shadow-[0_5px_0_rgba(34,197,94,0.7),0_0_24px_rgba(34,197,94,0.14)]
                  active:translate-y-[3px]
                  active:shadow-none
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-green-300/25
                    bg-green-400/[0.10]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  "
                >
                  <Bell size={20} className="text-green-400" />
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-green-100
                    "
                  >
                    Activer les notifications
                  </h4>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-green-100/40
                    "
                  >
                    Pour être au courant des nouvelles parties
                  </p>
                </div>

                <span
                  className="
                    shrink-0
                    pr-1
                    text-2xl
                    font-light
                    leading-none
                    text-green-200/50
                  "
                >
                  ›
                </span>
              </button>
            )}

            {notificationPermission === "granted" && (
              <div
                className="
                  flex
                  min-h-[56px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-green-400/20
                  bg-green-500/[0.07]
                  px-3.5
                  py-2.5
                  text-left
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-green-300/20
                    bg-green-400/[0.07]
                    text-lg
                  "
                >
                  <Bell size={20} className="text-green-400" />
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-green-100
                    "
                  >
                    Activé ✓
                  </h4>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-green-100/35
                    "
                  >
                    Vous recevrez des notifications pour chaque nouvelle partie
                  </p>
                </div>
              </div>
            )}

            {notificationPermission === "denied" && (
              <div
                className="
                  flex
                  min-h-[56px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-orange-400/20
                  bg-orange-500/[0.07]
                  px-3.5
                  py-2.5
                  text-left
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-orange-300/20
                    bg-orange-400/[0.07]
                    text-lg
                  "
                >
                  <Bell size={20} className="text-orange-400" />
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-orange-100
                    "
                  >
                    Notifications bloquées
                  </h4>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-orange-100/35
                    "
                  >
                    Activez-les dans les paramètres du navigateur
                  </p>
                </div>
              </div>
            )}
          </section>


        </div>


        {/* ========================================
            NAVIGATION BAS
        ======================================== */}

        <nav
          className="
            fixed
            bottom-3
            left-1/2
            z-50
            flex
            h-[64px]
            w-[calc(100%-24px)]
            max-w-[406px]
            -translate-x-1/2
            items-center
            justify-around
            rounded-2xl
            border
            border-blue-400/20
            bg-[#050914]/95
            px-2
            shadow-[0_10px_40px_rgba(0,0,0,0.5),0_3px_0_rgba(30,64,175,0.35)]
            backdrop-blur-xl
          "
        >

          {/* ACCUEIL */}

          <DashboardNavItem
            icon="🏠"
            label="Accueil"
            active
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          />


          {/* PORTEFEUILLE */}

          <DashboardNavItem
            icon="💼"
            label="Portefeuille"
            onClick={() =>
              router.push(
                "/wallet"
              )
            }
          />


          {/* HISTORIQUE */}

          <DashboardNavItem
            icon="📜"
            label="Historique"
            onClick={() =>
              router.push(
                "/historique"
              )
            }
          />


          {/* VYLO */}

          <DashboardNavItem
            icon="👥"
            label="VYLO"
            onClick={() =>
              router.push(
                "/vylo"
              )
            }
          />

        </nav>


      </div>

    </main>

  );

}


/*
====================================================
NAVIGATION ITEM
====================================================
*/

function DashboardNavItem({

  icon,

  label,

  active = false,

  onClick,

}: {

  icon: string;

  label: string;

  active?: boolean;

  onClick: () => void;

}) {

  return (

    <button
      type="button"
      onClick={onClick}
      className={`
        flex
        min-w-[60px]
        flex-col
        items-center
        justify-center
        gap-1
        rounded-xl
        py-1.5
        text-[8px]
        transition
        active:translate-y-[2px]
        ${
          active
            ? "font-bold text-blue-400"
            : "text-white/35"
        }
      `}
    >

      <span
        className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-xl
          text-[18px]
          ${
            active
              ? "border border-blue-400/25 bg-blue-500/[0.10] shadow-[0_2px_0_rgba(30,64,175,0.5)]"
              : ""
          }
        `}
      >

        {icon}

      </span>


      {label}

    </button>

  );

}