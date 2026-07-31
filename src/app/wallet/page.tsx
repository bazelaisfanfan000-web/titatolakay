"use client";

import {
  useEffect,
  useState,
  Suspense,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

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
====================================================
TiTaTo - WALLET PAGE
====================================================

Fonctions :

- Affichage du solde Firebase en temps réel
- Dépôt MonCash
- Retrait MonCash
- Authentification Firebase
- Token Firebase envoyé au serveur
- Numéro MonCash local : 31114949
- Numéro envoyé au serveur : +50931114949

Le serveur doit toujours vérifier :

- UID Firebase
- Solde réel
- Montant
- Numéro MonCash
- Retrait actif
- Verrou atomique
- Idempotence
====================================================
*/


function WalletContent() {
  const searchParams = useSearchParams();

  /*
  ==================================================
  AUTH
  ==================================================
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
  ==================================================
  SOLDE
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
    error,
    setError,
  ] = useState<string | null>(null);


  /*
  ==================================================
  MODALE DÉPÔT
  ==================================================
  */

  const [
    depositOpen,
    setDepositOpen,
  ] = useState(false);


  const [
    depositAmount,
    setDepositAmount,
  ] = useState("");


  const [
    depositLoading,
    setDepositLoading,
  ] = useState(false);


  const [
    depositMessage,
    setDepositMessage,
  ] = useState<string | null>(null);


  const [
    depositMessageType,
    setDepositMessageType,
  ] = useState<
    "error" |
    "info"
  >("info");


  /*
  ==================================================
  MODALE RETRAIT
  ==================================================
  */

  const [
    withdrawOpen,
    setWithdrawOpen,
  ] = useState(false);


  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState("");


  const [
    withdrawPhone,
    setWithdrawPhone,
  ] = useState("");


  const [
    withdrawLoading,
    setWithdrawLoading,
  ] = useState(false);


  const [
    withdrawMessage,
    setWithdrawMessage,
  ] = useState<string | null>(null);


  const [
    withdrawMessageType,
    setWithdrawMessageType,
  ] = useState<
    "error" |
    "info"
  >("info");


  /*
  ==================================================
  AUTH FIREBASE
  ==================================================
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

            setBalance(
              0
            );

            setBalanceLoading(
              false
            );

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  /*
  ==================================================
  SOLDE EN TEMPS RÉEL
  ==================================================
  */

  useEffect(() => {

    if (!currentUser) {

      setBalance(
        0
      );

      setBalanceLoading(
        false
      );

      return;

    }


    setBalanceLoading(
      true
    );

    setError(
      null
    );


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


          const numericBalance =
            Number(
              value || 0
            );


          setBalance(
            Number.isFinite(
              numericBalance
            )
              ? numericBalance
              : 0
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
  ==================================================
  VÉRIFICATION DU STATUT DE DÉPÔT AU RETOUR
  ==================================================
  */

  useEffect(() => {

    if (!currentUser) {
      return;
    }

    const reference = searchParams.get("reference");
    const orderId = searchParams.get("orderId");
    const referenceId = searchParams.get("referenceId");

    if (!referenceId) {
      return;
    }

    async function checkDepositStatus() {
      try {
        if (!currentUser) return;
        const token = await currentUser.getIdToken(true);

        const response = await fetch(
          `/api/wallet/deposit/status?referenceId=${referenceId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (result.success && result.deposit) {
          if (result.deposit.status === "completed") {
            setDepositMessage("✅ Dépôt réussi ! Votre solde a été crédité.");
            setDepositMessageType("info");
            setDepositOpen(true);
          } else if (result.deposit.status === "failed") {
            setDepositMessage(`❌ Dépôt échoué: ${result.deposit.failureReason || "Erreur inconnue"}`);
            setDepositMessageType("error");
            setDepositOpen(true);
          }
        }
      } catch (error) {
        console.error("Erreur vérification statut dépôt:", error);
      }
    }

    checkDepositStatus();

  }, [currentUser, searchParams]);


  /*
  ==================================================
  OUVRIR DÉPÔT
  ==================================================
  */

  const openDeposit =
    () => {

      setDepositAmount(
        ""
      );

      setDepositMessage(
        null
      );

      setDepositMessageType(
        "info"
      );

      setDepositOpen(
        true
      );

    };


  /*
  ==================================================
  FERMER DÉPÔT
  ==================================================
  */

  const closeDeposit =
    () => {

      if (
        depositLoading
      ) {

        return;

      }


      setDepositOpen(
        false
      );

      setDepositAmount(
        ""
      );

      setDepositMessage(
        null
      );

      setDepositMessageType(
        "info"
      );

    };


  /*
  ==================================================
  SÉLECTION MONTANT DÉPÔT
  ==================================================
  */

  const selectDepositAmount =
    (
      amount: number
    ) => {

      setDepositAmount(
        String(
          amount
        )
      );

      setDepositMessage(
        null
      );

      setDepositMessageType(
        "info"
      );

    };


  /*
  ==================================================
  CHANGEMENT MONTANT DÉPÔT
  ==================================================
  */

  const handleDepositAmountChange =
    (
      value: string
    ) => {

      const cleanValue =
        value.replace(
          /[^0-9]/g,
          ""
        );


      setDepositAmount(
        cleanValue
      );

      setDepositMessage(
        null
      );

      setDepositMessageType(
        "info"
      );

    };


  /*
  ==================================================
  CRÉER PAIEMENT MONCASH
  ==================================================
  */

  const handleDeposit =
    async () => {

      if (!currentUser) {

        setDepositMessage(
          "Votre session a expiré. Reconnectez-vous."
        );

        setDepositMessageType(
          "error"
        );

        return;

      }


      const amount =
        Number(
          depositAmount
        );


      if (
        !Number.isInteger(
          amount
        ) ||
        amount < 25
      ) {

        setDepositMessage(
          "Le montant minimum de dépôt est de 25 HTG."
        );

        setDepositMessageType(
          "error"
        );

        return;

      }


      if (
        amount > 10000
      ) {

        setDepositMessage(
          "Le montant maximum de dépôt est de 10 000 HTG."
        );

        setDepositMessageType(
          "error"
        );

        return;

      }


      setDepositLoading(
        true
      );

      setDepositMessage(
        "Préparation sécurisée du paiement..."
      );

      setDepositMessageType(
        "info"
      );


      try {

        const token =
          await currentUser.getIdToken(
            true
          );


        if (!token) {

          setDepositMessage(
            "Session expirée. Reconnectez-vous."
          );

          setDepositMessageType(
            "error"
          );

          return;

        }


        const response =
          await fetch(
            "/api/wallet/deposit",
            {
              method:
                "POST",

              headers:
                {
                  "Content-Type":
                    "application/json",

                  "Authorization":
                    `Bearer ${token}`,
                },

              body:
                JSON.stringify(
                  {
                    amount,
                  }
                ),

              cache:
                "no-store",
            }
          );


        let result:
          {
            success?: boolean;
            paymentUrl?: string;
            error?: string;
          } | null =
          null;


        try {

          result =
            await response.json();

        } catch {

          result =
            null;

        }


        if (
          !response.ok ||
          !result?.success
        ) {

          console.error(
            "Erreur API dépôt :",
            {
              status:
                response.status,

              result,
            }
          );


          setDepositMessage(
            result?.error ||
            "Impossible de créer le paiement MonCash."
          );

          setDepositMessageType(
            "error"
          );

          return;

        }


        if (
          !result.paymentUrl ||
          typeof result.paymentUrl !==
          "string"
        ) {

          setDepositMessage(
            "MonCash n'a pas retourné de lien de paiement."
          );

          setDepositMessageType(
            "error"
          );

          return;

        }


        window.location.assign(
          result.paymentUrl
        );


      } catch (
        depositError
      ) {

        console.error(
          "Erreur dépôt :",
          depositError
        );


        setDepositMessage(
          "Impossible de démarrer le paiement. Vérifiez votre connexion."
        );

        setDepositMessageType(
          "error"
        );


      } finally {

        setDepositLoading(
          false
        );

      }

    };


  /*
  ==================================================
  OUVRIR RETRAIT
  ==================================================
  */

  const openWithdraw =
    () => {

      setWithdrawAmount(
        ""
      );

      setWithdrawPhone(
        ""
      );

      setWithdrawMessage(
        null
      );

      setWithdrawMessageType(
        "info"
      );

      setWithdrawOpen(
        true
      );

    };


  /*
  ==================================================
  FERMER RETRAIT
  ==================================================
  */

  const closeWithdraw =
    () => {

      if (
        withdrawLoading
      ) {

        return;

      }


      setWithdrawOpen(
        false
      );

      setWithdrawAmount(
        ""
      );

      setWithdrawPhone(
        ""
      );

      setWithdrawMessage(
        null
      );

      setWithdrawMessageType(
        "info"
      );

    };


  /*
  ==================================================
  CHANGEMENT MONTANT RETRAIT
  ==================================================
  */

  const handleWithdrawAmountChange =
    (
      value: string
    ) => {

      const cleanValue =
        value.replace(
          /[^0-9]/g,
          ""
        );


      setWithdrawAmount(
        cleanValue
      );

      setWithdrawMessage(
        null
      );

      setWithdrawMessageType(
        "info"
      );

    };


  /*
  ==================================================
  CHANGEMENT NUMÉRO MONCASH
  ==================================================
  */

  const handleWithdrawPhoneChange =
    (
      value: string
    ) => {

      const cleanValue =
        value.replace(
          /[^0-9]/g,
          ""
        );


      const limitedValue =
        cleanValue.slice(
          0,
          8
        );


      setWithdrawPhone(
        limitedValue
      );

      setWithdrawMessage(
        null
      );

      setWithdrawMessageType(
        "info"
      );

    };


  /*
  ==================================================
  RETRAIT MONCASH
  ==================================================
  */

  const handleWithdraw =
    async () => {

      /*
      ==============================================
      AUTHENTIFICATION
      ==============================================
      */

      if (!currentUser) {

        setWithdrawMessage(
          "Votre session a expiré. Reconnectez-vous."
        );

        setWithdrawMessageType(
          "error"
        );

        return;

      }


      /*
      ==============================================
      MONTANT
      ==============================================
      */

      const amount =
        Number(
          withdrawAmount
        );


      if (
        !Number.isInteger(
          amount
        ) ||
        amount < 100
      ) {

        setWithdrawMessage(
          "Le montant minimum de retrait est de 100 HTG."
        );

        setWithdrawMessageType(
          "error"
        );

        return;

      }


      if (
        amount > 10000
      ) {

        setWithdrawMessage(
          "Le montant maximum de retrait est de 10 000 HTG."
        );

        setWithdrawMessageType(
          "error"
        );

        return;

      }


      /*
      ==============================================
      VÉRIFICATION UX DU SOLDE

      IMPORTANT :

      Cette vérification est uniquement
      une aide utilisateur.

      Le serveur DOIT refaire cette vérification
      avec le vrai solde Firebase.
      ==============================================
      */

      if (
        amount >
        balance
      ) {

        setWithdrawMessage(
          "Votre solde disponible est insuffisant."
        );

        setWithdrawMessageType(
          "error"
        );

        return;

      }


      /*
      ==============================================
      NUMÉRO MONCASH
      ==============================================
      */

      const localPhone =
        withdrawPhone.trim();


      if (
        !/^\d{8}$/.test(
          localPhone
        )
      ) {

        setWithdrawMessage(
          "Veuillez saisir les 8 chiffres de votre numéro MonCash."
        );

        setWithdrawMessageType(
          "error"
        );

        return;

      }


      /*
      ==============================================
      NUMÉRO COMPLET

      Exemple :

      31114949

      devient :

      +50931114949
      ==============================================
      */

      const phoneNumber =
        `+509${localPhone}`;


      /*
      ==============================================
      DÉMARRAGE
      ==============================================
      */

      setWithdrawLoading(
        true
      );

      setWithdrawMessage(
        "Vérification sécurisée de votre retrait..."
      );

      setWithdrawMessageType(
        "info"
      );


      try {

        /*
        ==========================================
        TOKEN FIREBASE
        ==========================================
        */

        const token =
          await currentUser.getIdToken(
            true
          );


        if (!token) {

          setWithdrawMessage(
            "Session expirée. Reconnectez-vous."
          );

          setWithdrawMessageType(
            "error"
          );

          return;

        }


        /*
        ==========================================
        APPEL API

        Le UID n'est PAS envoyé.

        Le serveur récupère le UID depuis
        le Firebase ID Token.
        ==========================================
        */

        const response =
          await fetch(
            "/api/wallet/withdraw",
            {
              method:
                "POST",

              headers:
                {
                  "Content-Type":
                    "application/json",

                  "Authorization":
                    `Bearer ${token}`,
                },

              body:
                JSON.stringify(
                  {
                    amount,
                    moncashNumber: localPhone,
                  }
                ),

              cache:
                "no-store",
            }
          );


        /*
        ==========================================
        RÉPONSE API
        ==========================================
        */

        let result:
          {
            success?: boolean;
            withdrawalId?: string;
            status?: string;
            message?: string;
            error?: string;
            errorMessage?: string;
          } | null =
          null;


        try {

          result =
            await response.json();

        } catch {

          result =
            null;

        }


        /*
        ==========================================
        ERREUR
        ==========================================
        */

        if (
          !response.ok ||
          !result?.success
        ) {

          console.error(
            "Erreur API retrait :",
            `Status: ${response.status} ${response.statusText}`,
            `Result: ${JSON.stringify(result)}`
          );


          setWithdrawMessage(
            result?.error ||
            result?.errorMessage ||
            `Erreur serveur (${response.status})`
          );


          setWithdrawMessageType(
            "error"
          );


          return;

        }


        /*
        ==========================================
        SUCCÈS
        ==========================================
        */

        setWithdrawMessage(

          result.message ||

          "Votre demande de retrait a été créée. Le transfert vers votre compte MonCash est en cours."

        );


        setWithdrawMessageType(
          "info"
        );


        /*
        ==========================================
        RAFRAÎCHIR LE SOLDE

        Le listener Firebase en temps réel
        mettra automatiquement le solde à jour.

        On ferme la fenêtre après 3 secondes.
        ==========================================
        */

        window.setTimeout(
          () => {

            setWithdrawOpen(
              false
            );

            setWithdrawAmount(
              ""
            );

            setWithdrawPhone(
              ""
            );

            setWithdrawMessage(
              null
            );

          },
          3000
        );


      } catch (
        withdrawError
      ) {

        console.error(
          "Erreur retrait :",
          withdrawError
        );


        setWithdrawMessage(
          "Impossible de démarrer le retrait. Vérifiez votre connexion."
        );


        setWithdrawMessageType(
          "error"
        );


      } finally {

        setWithdrawLoading(
          false
        );

      }

    };


  /*
  ==================================================
  CHARGEMENT AUTH
  ==================================================
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
  ==================================================
  PAS CONNECTÉ
  ==================================================
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
  ==================================================
  FORMATAGE SOLDE
  ==================================================
  */

  const formattedBalance =
    balance.toLocaleString(
      "fr-FR"
    );


  /*
  ==================================================
  INTERFACE
  ==================================================
  */

  return (

    <main className="min-h-screen bg-[#030303] text-white">

      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden bg-[#030303]">


        {/* ==========================================
            HEADER
        ========================================== */}

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


        {/* ==========================================
            CONTENU
        ========================================== */}

        <div className="px-4 pb-[90px] pt-5">


          {/* ERREUR SOLDE */}

          {error && (

            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] leading-4 text-red-300">
              {error}
            </div>

          )}


          {/* ========================================
              CARTE SOLDE
          ======================================== */}

          <section className="relative overflow-hidden rounded-[22px] border border-blue-500/20 bg-gradient-to-br from-blue-700/35 via-blue-600/15 to-[#050505] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.45)]">

            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-blue-700/10 blur-3xl" />

            <div className="relative">

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


              <div className="mt-6 flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_9px_rgba(34,197,94,0.7)]" />

                <span className="text-[9px] text-white/35">
                  Solde disponible
                </span>

              </div>

            </div>

          </section>


          {/* ========================================
              ACTIONS
          ======================================== */}

          <section className="mt-5 grid grid-cols-2 gap-3">


            {/* DÉPÔT */}

            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="group relative overflow-hidden rounded-xl border border-blue-400/30 bg-blue-600/15 px-3 py-3 text-left shadow-[0_4px_0_rgba(20,80,200,0.35),0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-600/20 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(20,80,200,0.35),0_4px_12px_rgba(0,0,0,0.35)]"
            >

              <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-blue-400/15 blur-2xl" />

              <div className="relative flex items-center gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/15 text-base shadow-[0_2px_0_rgba(20,80,200,0.3)]">
                  💳
                </div>

                <div>

                  <p className="text-[11px] font-black">
                    Déposer
                  </p>

                  <p className="mt-0.5 text-[8px] leading-3 text-white/35">
                    Ajouter de l'argent
                  </p>

                </div>

              </div>

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400/50 transition-transform duration-200 group-hover:translate-x-1">
                ›
              </div>

            </button>


            {/* RETRAIT */}

            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              disabled={balanceLoading}
              className="group relative overflow-hidden rounded-xl border border-blue-400/20 bg-white/[0.035] px-3 py-3 text-left shadow-[0_4px_0_rgba(20,60,140,0.25),0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 hover:border-blue-400/40 hover:bg-blue-600/10 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(20,60,140,0.25),0_4px_12px_rgba(0,0,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >

              <div className="pointer-events-none absolute -left-5 -top-5 h-16 w-16 rounded-full bg-blue-400/10 blur-2xl" />

              <div className="relative flex items-center gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-base shadow-[0_2px_0_rgba(20,60,140,0.25)]">
                  💸
                </div>

                <div className="flex flex-col">

                  <div className="text-[11px] font-black text-white">
                    Retirer
                  </div>

                  <div className="text-[8px] text-white/50">
                    Retirer de l'argent
                  </div>

                </div>

              </div>

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400/40 transition-transform duration-200 group-hover:translate-x-1">
                ›
              </div>

            </button>

          </section>


          {/* ========================================
              INFORMATIONS
          ======================================== */}

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

        </div>


        {/* ==========================================
            MODALE DÉPÔT
        ========================================== */}

        {depositOpen && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md">

            <div className="w-full max-w-[430px] overflow-hidden rounded-[24px] border border-blue-500/20 bg-[#080808] shadow-[0_10px_50px_rgba(0,0,0,0.7)]">


              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-lg shadow-[0_3px_0_rgba(20,80,200,0.3)]">
                    💳
                  </div>

                  <div>

                    <h2 className="text-[15px] font-black">
                      Déposer de l'argent
                    </h2>

                    <p className="mt-0.5 text-[9px] text-white/30">
                      Ajouter des HTG à votre wallet
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={closeDeposit}
                  disabled={depositLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white/50 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-40"
                >
                  ✕
                </button>

              </div>


              <div className="px-5 pb-6 pt-5">


                <p className="mb-3 text-[10px] font-bold text-white/45">
                  Choisissez un montant
                </p>


                <div className="grid grid-cols-5 gap-2">

                  {[
                    25,
                    100,
                    250,
                    500,
                    1000,
                  ].map(
                    (
                      amount
                    ) => (

                      <button
                        key={amount}
                        type="button"
                        onClick={() =>
                          selectDepositAmount(
                            amount
                          )
                        }
                        disabled={depositLoading}
                        className={`rounded-xl border px-1 py-2.5 text-[9px] font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                          Number(
                            depositAmount
                          ) === amount
                            ? "border-blue-400/60 bg-blue-600/25 text-blue-300 shadow-[0_3px_0_rgba(20,80,200,0.4)]"
                            : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:border-blue-400/30 hover:bg-blue-600/10"
                        }`}
                      >

                        {amount.toLocaleString(
                          "fr-FR"
                        )}

                        <span className="ml-0.5 text-[7px] text-white/30">
                          HTG
                        </span>

                      </button>

                    )
                  )}

                </div>


                <div className="mt-5">

                  <label
                    htmlFor="deposit-amount"
                    className="mb-2 block text-[10px] font-bold text-white/45"
                  >
                    Ou saisissez un montant
                  </label>


                  <div className="relative">

                    <input
                      id="deposit-amount"
                      type="text"
                      inputMode="numeric"
                      value={depositAmount}
                      onChange={(
                        event
                      ) =>
                        handleDepositAmountChange(
                          event.target.value
                        )
                      }
                      placeholder="Montant"
                      disabled={depositLoading}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-16 text-[15px] font-black text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/50 focus:bg-blue-600/5 disabled:opacity-50"
                    />


                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                      HTG
                    </span>

                  </div>

                </div>


                {depositMessage && (

                  <div
                    className={`mt-4 rounded-xl px-3 py-2.5 text-[9px] leading-4 ${
                      depositMessageType === "error"
                        ? "border border-red-500/20 bg-red-500/10 text-red-300"
                        : "border border-blue-500/20 bg-blue-500/10 text-blue-300"
                    }`}
                  >

                    {depositMessage}

                  </div>

                )}


                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={depositLoading}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-600/20 text-[11px] font-black text-white shadow-[0_4px_0_rgba(20,80,200,0.4),0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-blue-400/60 hover:bg-blue-600/30 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(20,80,200,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {depositLoading ? (

                    <>

                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                      Préparation du paiement...

                    </>

                  ) : (

                    <>

                      💳

                      Continuer avec MonCash

                      <span className="text-blue-300">
                        ›
                      </span>

                    </>

                  )}

                </button>


                <p className="mt-3 text-center text-[8px] leading-4 text-white/20">

                  Le paiement sera sécurisé par MonCash.
                  <br />
                  Votre solde sera crédité après confirmation du paiement.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* ==========================================
            MODALE RETRAIT
        ========================================== */}

        {withdrawOpen && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md">

            <div className="w-full max-w-[430px] overflow-hidden rounded-[24px] border border-blue-500/20 bg-[#080808] shadow-[0_10px_50px_rgba(0,0,0,0.7)]">


              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-lg shadow-[0_3px_0_rgba(20,80,200,0.3)]">
                    💸
                  </div>

                  <div>

                    <h2 className="text-[15px] font-black">
                      Retirer de l'argent
                    </h2>

                    <p className="mt-0.5 text-[9px] text-white/30">
                      Transfert automatique vers MonCash
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={closeWithdraw}
                  disabled={withdrawLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white/50 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-40"
                >
                  ✕
                </button>

              </div>


              <div className="px-5 pb-6 pt-5">


                {/* SOLDE */}

                <div className="mb-4 rounded-xl border border-blue-500/15 bg-blue-600/10 px-4 py-3">

                  <div className="flex items-center justify-between">

                    <span className="text-[9px] text-white/35">
                      Solde disponible
                    </span>

                    <span className="text-[11px] font-black text-blue-300">
                      {formattedBalance} HTG
                    </span>

                  </div>

                </div>


                {/* MONTANT */}

                <label
                  htmlFor="withdraw-amount"
                  className="mb-2 block text-[10px] font-bold text-white/45"
                >
                  Montant du retrait
                </label>


                <div className="relative">

                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="numeric"
                    value={withdrawAmount}
                    onChange={(
                      event
                    ) =>
                      handleWithdrawAmountChange(
                        event.target.value
                      )
                    }
                    placeholder="Ex. 500"
                    disabled={withdrawLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-16 text-[15px] font-black text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/50 focus:bg-blue-600/5 disabled:opacity-50"
                  />


                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                    HTG
                  </span>

                </div>


                <p className="mt-2 text-[8px] leading-4 text-white/25">
                  Minimum de retrait : 100 HTG.
                </p>


                {/* NUMÉRO MONCASH */}

                <div className="mt-5">

                  <label
                    htmlFor="withdraw-phone"
                    className="mb-2 block text-[10px] font-bold text-white/45"
                  >
                    Numéro MonCash
                  </label>


                  <div className="flex h-12 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition focus-within:border-blue-500/50 focus-within:bg-blue-600/5">


                    {/* PRÉFIXE */}

                    <div className="flex items-center border-r border-white/10 bg-blue-600/10 px-4 text-[14px] font-black tracking-wide text-blue-300">
                      +509
                    </div>


                    {/* NUMÉRO */}

                    <input
                      id="withdraw-phone"
                      type="tel"
                      inputMode="numeric"
                      value={withdrawPhone}
                      onChange={(
                        event
                      ) =>
                        handleWithdrawPhoneChange(
                          event.target.value
                        )
                      }
                      placeholder="31114949"
                      maxLength={8}
                      disabled={withdrawLoading}
                      className="min-w-0 flex-1 bg-transparent px-4 text-[14px] font-black tracking-wide text-white outline-none placeholder:text-white/20 disabled:opacity-50"
                    />

                  </div>


                  <p className="mt-2 text-[8px] leading-4 text-white/25">

                    Saisissez uniquement les 8 chiffres de votre numéro MonCash.

                    <br />

                    Exemple :

                    <span className="font-bold text-white/40">
                      {" "}
                      31114949
                    </span>

                  </p>

                </div>


                {/* MESSAGE */}

                {withdrawMessage && (

                  <div
                    className={`mt-4 rounded-xl px-3 py-2.5 text-[9px] leading-4 ${
                      withdrawMessageType === "error"
                        ? "border border-red-500/20 bg-red-500/10 text-red-300"
                        : "border border-blue-500/20 bg-blue-500/10 text-blue-300"
                    }`}
                  >

                    {withdrawMessage}

                  </div>

                )}


                {/* BOUTON */}

                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-600/20 text-[11px] font-black text-white shadow-[0_4px_0_rgba(20,80,200,0.4),0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-blue-400/60 hover:bg-blue-600/30 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(20,80,200,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {withdrawLoading ? (

                    <>

                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                      Traitement sécurisé...

                    </>

                  ) : (

                    <>

                      💸

                      Confirmer le retrait

                      <span className="text-blue-300">
                        ›
                      </span>

                    </>

                  )}

                </button>

                <p className="mt-3 text-center text-[8px] leading-4 text-white/20">

                  Votre demande est vérifiée côté serveur.
                  Le transfert est traité automatiquement par MonCashConnect.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* ==========================================
            NAVIGATION
        ========================================== */}

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


            {/* WALLET */}

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

export default function WalletPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#030303] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">
          <div className="text-center">
            <div className="mb-4 text-4xl">💙</div>
            <h1 className="text-lg font-black">Wallet</h1>
            <p className="mt-2 text-[10px] text-white/30">Chargement...</p>
          </div>
        </div>
      </main>
    }>
      <WalletContent />
    </Suspense>
  );
}