"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  onValue,
  ref,
} from "firebase/database";


/*
========================================
PAGE WALLET
========================================
*/

export default function WalletPage() {

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
  SOLDE
  ======================================
  */

  const [
    balance,
    setBalance,
  ] = useState(0);


  /*
  ======================================
  UID
  ======================================
  */

  const [
    uid,
    setUid,
  ] = useState("");


  /*
  ======================================
  CHARGEMENT
  ======================================
  */

  const [
    balanceLoading,
    setBalanceLoading,
  ] = useState(true);


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


          if (!user) {

            setUid("");

            setBalance(0);

            setBalanceLoading(
              false
            );

            return;

          }


          setUid(
            user.uid
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  /*
  ======================================
  SOLDE EN TEMPS RÉEL
  ======================================
  */

  useEffect(() => {

    if (
      !currentUser
    ) {

      return;

    }


    setBalanceLoading(
      true
    );

    setError(null);


    const balanceRef =
      ref(
        database,
        `users/${currentUser.uid}/balance`
      );


    const unsubscribe =
      onValue(
        balanceRef,
        (snapshot) => {

          const value =
            snapshot.val();


          setBalance(
            Number(
              value || 0
            )
          );


          setBalanceLoading(
            false
          );

        },
        (firebaseError) => {

          console.error(
            "Erreur chargement solde :",
            firebaseError
          );


          setBalance(
            0
          );


          setBalanceLoading(
            false
          );


          setError(
            "Impossible de charger votre solde."
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    currentUser,
  ]);


  /*
  ======================================
  CHARGEMENT AUTH
  ======================================
  */

  if (
    authLoading
  ) {

    return (

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">

          <div className="text-center">

            <div className="mb-4 text-4xl">
              💙
            </div>

            <h1 className="text-lg font-black">
              Wallet
            </h1>

            <p className="mt-2 text-[10px] text-white/30">
              Vérification de votre session...
            </p>

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

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">

          <div className="w-full text-center">

            <div className="mb-4 text-4xl">
              🔐
            </div>

            <h1 className="text-xl font-black">
              Connexion requise
            </h1>

            <p className="mx-auto mt-2 max-w-[260px] text-xs leading-5 text-white/40">
              Connectez-vous pour accéder à votre wallet.
            </p>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  FORMATAGE SOLDE
  ======================================
  */

  const formattedBalance =
    balance.toLocaleString(
      "fr-FR"
    );


  /*
  ======================================
  INTERFACE MOBILE
  ======================================
  */

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

          <div className="flex h-[58px] items-center justify-between px-4">


            <div>

              <h1 className="text-[18px] font-black tracking-tight">
                Wallet
              </h1>

              <p className="mt-0.5 text-[9px] text-white/30">
                Votre argent
              </p>

            </div>


            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 text-sm shadow-[0_3px_0_rgba(30,100,255,0.35)]">

              💰

            </div>


          </div>

        </header>


        {/* =================================
            CONTENU
        ================================= */}

        <div className="px-4 pb-[90px] pt-5">


          {/* =================================
              ERREUR
          ================================= */}

          {error && (

            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] leading-4 text-red-300">

              {error}

            </div>

          )}


          {/* =================================
              CARTE DU SOLDE
          ================================= */}

          <section className="relative overflow-hidden rounded-[22px] border border-blue-500/20 bg-gradient-to-br from-blue-700/35 via-blue-600/15 to-[#050505] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.45)]">


            {/* DÉCORATION */}

            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-blue-700/10 blur-3xl" />


            <div className="relative">


              {/* TITRE */}

              <div className="flex items-start justify-between">


                <div>

                  <p className="text-[10px] font-medium text-white/45">
                    Solde disponible
                  </p>

                  <p className="mt-1 text-[9px] text-white/25">
                    Portefeuille
                  </p>

                </div>


                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-lg">

                  💳

                </div>


              </div>


              {/* MONTANT */}

              <div className="mt-7">


                {balanceLoading ? (

                  <div className="h-10 w-40 animate-pulse rounded-lg bg-white/10" />

                ) : (

                  <div className="flex items-end gap-2">

                    <span className="text-[34px] font-black leading-none tracking-tight">

                      {formattedBalance}

                    </span>

                    <span className="mb-0.5 text-xs font-bold text-white/45">

                      HTG

                    </span>

                  </div>

                )}


              </div>


              {/* STATUT */}

              <div className="mt-6 flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_9px_rgba(34,197,94,0.7)]" />

                <span className="text-[9px] text-white/35">
                  Solde disponible
                </span>

              </div>


            </div>

          </section>


          {/* =================================
              INFORMATIONS
          ================================= */}

          <section className="mt-6">


            <div className="mb-3">

              <h3 className="text-[14px] font-black">
                Informations
              </h3>

            </div>


            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">


              {/* SOLDE */}

              <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">


                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10 text-sm">

                  💰

                </div>


                <div className="min-w-0 flex-1">

                  <p className="text-[11px] font-bold">
                    Solde actuel
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/30">
                    Argent disponible
                  </p>

                </div>


                <span className="text-[10px] font-black text-blue-400">

                  {formattedBalance} HTG

                </span>


              </div>


              {/* COMPTE */}

              <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">


                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">

                  👤

                </div>


                <div className="min-w-0 flex-1">

                  <p className="text-[11px] font-bold">
                    Compte
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/30">
                    Compte connecté
                  </p>

                </div>


                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[8px] font-bold text-green-400">

                  Actif

                </span>


              </div>


              {/* SÉCURITÉ */}

              <div className="flex items-center gap-3 px-4 py-3.5">


                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">

                  🔐

                </div>


                <div className="min-w-0 flex-1">

                  <p className="text-[11px] font-bold">
                    Sécurité
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/30">
                    Votre wallet est protégé
                  </p>

                </div>


                <span className="text-[9px] font-bold text-green-400">

                  Sécurisé

                </span>


              </div>


            </div>

          </section>


          {/* =================================
              IDENTIFIANT
          ================================= */}

          <section className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">


            <div className="flex items-center gap-3">


              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">

                🆔

              </div>


              <div className="min-w-0 flex-1">

                <p className="text-[10px] font-bold text-white/55">
                  Identifiant du compte
                </p>

                <p className="mt-1 truncate text-[8px] text-white/20">
                  {uid}
                </p>

              </div>


            </div>

          </section>


        </div>


        {/* =================================
            NAVIGATION MOBILE
        ================================= */}

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">


          <div className="mx-auto flex h-[62px] w-full max-w-[430px] items-center justify-around px-4">


            {/* ACCUEIL */}

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                🏠
              </span>

              Accueil

            </button>


            {/* PORTEFEUILLE - ACTIF */}

            <button
              type="button"
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] font-bold text-blue-400"
            >

              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-[17px] shadow-[0_3px_0_rgba(20,70,200,0.35)]">
                💼
              </span>

              Portefeuille

            </button>


            {/* NOTIFICATIONS */}

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/notifications";
              }}
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                🔔
              </span>

              Notifications

            </button>


            {/* VYLO */}

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/vylo";
              }}
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