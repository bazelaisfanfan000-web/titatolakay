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
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";

import WageringProgress from "@/components/WageringProgress";
import { useLanguage } from "@/context/LanguageContext";


/*
====================================================
WALLET PAGE
====================================================
*/


function WalletContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

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
  TRANSACTIONS (HISTORIQUE)
  ==================================================
  */

  const [
    transactions,
    setTransactions,
  ] = useState<any[]>([]);

  const [
    transactionsLoading,
    setTransactionsLoading,
  ] = useState(true);


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
  MODALE RETRAIT (PERSONNALISÉE)
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


    // Timeout de sécurité pour éviter l'écran de chargement infini
    const timeout = setTimeout(() => {
      setAuthLoading(false);
      console.warn("Auth timeout - forcing authLoading to false");
    }, 10000);

    return () => {
      clearTimeout(timeout);
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
  TRANSACTIONS EN TEMPS RÉEL
  ==================================================
  */

  useEffect(() => {

    if (!currentUser) {

      setTransactions(
        []
      );

      setTransactionsLoading(
        false
      );

      return;

    }


    setTransactionsLoading(
      true
    );


    const transactionsRef =
      query(
        ref(
          database,
          `users/${currentUser.uid}/transactions`
        ),
        orderByChild(
          "timestamp"
        ),
        limitToLast(
          5
        )
      );


    const unsubscribe =
      onValue(

        transactionsRef,

        (snapshot) => {

          const data =
            snapshot.val();


          if (!data) {

            setTransactions(
              []
            );

            setTransactionsLoading(
              false
            );

            return;

          }


          const list =
            Object
              .keys(
                data
              )
              .map(
                (
                  key
                ) => ({

                  id:
                    key,

                  ...data[
                    key
                  ],

                })
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  b
                    .timestamp -
                  a
                    .timestamp
              )
              .slice(
                0,
                5
              );


          setTransactions(
            list
          );

          setTransactionsLoading(
            false
          );

        },

        (
          firebaseError
        ) => {

          console.error(
            "Erreur chargement transactions :",
            firebaseError
          );

          setTransactions(
            []
          );

          setTransactionsLoading(
            false
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
  CRÉER PAIEMENT MONCASH (DÉPÔT)
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
        amount < 10
      ) {

        setDepositMessage(
          "Le montant minimum de dépôt est de 10 HTG."
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
  GESTION RETRAIT (PERSONNALISÉ)
  ==================================================
  */

  const openWithdraw = () => {
    setWithdrawAmount("");
    setWithdrawPhone("");
    setWithdrawMessage(null);
    setWithdrawMessageType("info");
    setWithdrawOpen(true);
  };

  const closeWithdraw = () => {
    if (withdrawLoading) return;
    setWithdrawOpen(false);
    setWithdrawAmount("");
    setWithdrawPhone("");
    setWithdrawMessage(null);
    setWithdrawMessageType("info");
  };

  const handleWithdrawAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    setWithdrawAmount(cleanValue);
    setWithdrawMessage(null);
    setWithdrawMessageType("info");
  };

  const handleWithdraw = async () => {
    if (!currentUser) {
      setWithdrawMessage("Votre session a expiré. Reconnectez-vous.");
      setWithdrawMessageType("error");
      return;
    }

    const amount = Number(withdrawAmount);
    if (!Number.isInteger(amount) || amount < 100) {
      setWithdrawMessage("Le montant minimum de retrait est de 100 HTG.");
      setWithdrawMessageType("error");
      return;
    }

    if (amount > balance) {
      setWithdrawMessage("Vous ne disposez pas de suffisamment de fonds.");
      setWithdrawMessageType("error");
      return;
    }

    // Validation du numéro MonCash
    const phoneDigits = withdrawPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      setWithdrawMessage("Veuillez saisir un numéro MonCash valide (8 chiffres minimum).");
      setWithdrawMessageType("error");
      return;
    }

    // Formater le numéro avec le préfixe +509
    const formattedPhone = phoneDigits.length === 8 ? `+509${phoneDigits}` : withdrawPhone;

    setWithdrawLoading(true);
    setWithdrawMessage("Traitement en cours...");
    setWithdrawMessageType("info");

    try {
      const token = await currentUser.getIdToken(true);
      if (!token) {
        setWithdrawMessage("Session expirée. Reconnectez-vous.");
        setWithdrawMessageType("error");
        return;
      }

      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          moncashNumber: formattedPhone, // Envoi du numéro formaté
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setWithdrawMessage(result?.error || "Échec du retrait. Veuillez réessayer.");
        setWithdrawMessageType("error");
        return;
      }

      setWithdrawMessage("✅ Retrait effectué ! Vous allez recevoir le montant net sur MonCash.");
      setWithdrawMessageType("info");
      setTimeout(() => {
        closeWithdraw();
      }, 2000);

    } catch (err) {
      console.error("Erreur retrait :", err);
      setWithdrawMessage("Impossible de traiter votre demande. Vérifiez votre connexion.");
      setWithdrawMessageType("error");
    } finally {
      setWithdrawLoading(false);
    }
  };


  /*
  ==================================================
  FORMATTAGE SOLDE
  ==================================================
  */

  const formattedBalance =
    balance.toLocaleString(
      "fr-FR"
    );


  /*
  ==================================================
  RENDER
  ==================================================
  */

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#030303] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">
          <div className="text-center">
            <div className="mb-4 text-4xl">💙</div>
            <h1 className="text-lg font-black">Wallet</h1>
            <p className="mt-2 text-[10px] text-white/30">Chargement...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#030303] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-5">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔐</div>
            <h1 className="text-lg font-black">Connexion requise</h1>
            <p className="mt-2 text-[10px] text-white/30">Veuillez vous connecter pour accéder à votre wallet</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white">

      <div className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 py-4">

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
                    {t.wallet}
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
              onClick={openWithdraw}
              disabled={balanceLoading || balance === 0}
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
                    {balance === 0
                      ? "Aucun fonds"
                      : "Retirer de l'argent"}
                  </div>

                </div>

              </div>

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400/40 transition-transform duration-200 group-hover:translate-x-1">
                ›
              </div>

            </button>

          </section>

          {/* ========================================
              WAGERING PROGRESS
          ======================================== */}

          {currentUser && (
            <section className="mt-6">
              <WageringProgress userId={currentUser.uid} />
            </section>
          )}


          {/* ========================================
              HISTORIQUE DES TRANSACTIONS
          ======================================== */}

          <section className="mt-6">

            <div className="mb-3 flex items-center justify-between">

              <h3 className="text-[14px] font-black">
                Dernières transactions
              </h3>

              <span className="text-[8px] text-white/20">
                {transactionsLoading ? "..." : transactions.length}
              </span>

            </div>


            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

              {transactionsLoading ? (

                <div className="flex items-center justify-center py-4 text-[9px] text-white/20">
                  Chargement...
                </div>

              ) : transactions.length === 0 ? (

                <div className="flex flex-col items-center justify-center py-6 text-[9px] text-white/20">

                  <span className="mb-1 text-2xl">
                    📭
                  </span>

                  Aucune transaction récente

                </div>

              ) : (

                <div className="divide-y divide-white/[0.05]">

                  {transactions.map(
                    (
                      tx
                    ) => {

                      const isDeposit = tx.type === "deposit";
                      const isWithdraw = tx.type === "withdraw";
                      const isWin = tx.type === "win";

                      let prefix = "";
                      let color = "";

                      if (isDeposit) {
                        prefix = "+";
                        color = "text-green-400";
                      } else if (isWithdraw) {
                        prefix = "−";
                        color = "text-red-400";
                      } else if (isWin) {
                        prefix = "+";
                        color = "text-amber-400";
                      } else {
                        prefix = "";
                        color = "text-white/40";
                      }

                      const amount = Number(tx.amount) || 0;
                      const label = tx.label || tx.type || "Transaction";
                      const date = new Date(tx.timestamp || Date.now());

                      return (

                        <div
                          key={tx.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">
                            {isDeposit ? "📥" : isWithdraw ? "📤" : isWin ? "🏆" : "💱"}
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="text-[9px] font-bold leading-tight text-white/80">
                              {label}
                            </p>

                            <p className="mt-0.5 text-[8px] text-white/25">
                              {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>

                          </div>

                          <span className={`text-[10px] font-black ${color}`}>
                            {prefix}{amount.toLocaleString('fr-FR')} HTG
                          </span>

                        </div>

                      );

                    }
                  )}

                </div>

              )}

            </div>

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

              {/* ========================================
                  FRAIS DE TRANSACTION
              ======================================== */}

              <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">
                  📊
                </div>

                <div className="min-w-0 flex-1">

                  <p className="text-[11px] font-bold">
                    Frais de transaction
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/30">
                    Dépôt (MonCash) : <span className="text-blue-300 font-bold">3%</span> · Retrait (MonCash) : <span className="text-blue-300 font-bold">5%</span>
                  </p>

                </div>

                <span className="text-[9px] font-bold text-blue-400">
                  HTG
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
            MODALE DÉPÔT (avec frais 3%)
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

                    <div className="mt-2 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2">
                      <p className="text-center text-[10px] font-medium text-blue-300">
                        ⏱️ La vérification des dépôts prend 2 minutes maximum
                      </p>
                    </div>

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

                  {/* AFFICHAGE DES FRAIS DE DÉPÔT (3%) */}
                  {depositAmount && !isNaN(Number(depositAmount)) && Number(depositAmount) > 0 && (
                    <div className="mt-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 shadow-[0_0_20px_rgba(30,100,255,0.1)]">
                      <p className="text-[9px] font-medium text-white/80">
                        <span className="text-blue-300">Frais de transfert MonCash (3%)</span> :
                        <span className="ml-1 font-black text-white">{ (Number(depositAmount) * 0.03).toLocaleString('fr-FR') } HTG</span>
                      </p>
                      <p className="mt-1 text-[9px] font-bold">
                        <span className="text-white/50">Vous recevrez : </span>
                        <span className="font-black text-blue-400">{ (Number(depositAmount) * 0.97).toLocaleString('fr-FR') } HTG</span>
                        <span className="text-white/50"> sur votre compte WinCash</span>
                      </p>
                    </div>
                  )}


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

                      Continuer avec

                      <span className="font-bold text-blue-300">
                        MonCash
                      </span>

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
            MODALE RETRAIT (avec numéro MonCash et frais 5% affichés en gros)
        ========================================== */}

        {withdrawOpen && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md">

            <div className="w-full max-w-[430px] overflow-hidden rounded-[24px] border border-blue-500/20 bg-[#080808] shadow-[0_10px_50px_rgba(0,0,0,0.7)]">


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
                      Transférer vers MonCash
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

                <p className="mb-3 text-[10px] font-bold text-white/45">
                  Solde disponible : <span className="text-blue-300 font-black">{formattedBalance} HTG</span>
                </p>

                {/* Montant */}
                <div>
                  <label
                    htmlFor="withdraw-amount"
                    className="mb-2 block text-[10px] font-bold text-white/45"
                  >
                    Montant à retirer
                  </label>

                  <div className="relative">
                    <input
                      id="withdraw-amount"
                      type="text"
                      inputMode="numeric"
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ""));
                        setWithdrawMessage(null);
                      }}
                      placeholder="Montant"
                      disabled={withdrawLoading}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-16 text-[15px] font-black text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/50 focus:bg-blue-600/5 disabled:opacity-50"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                      HTG
                    </span>
                  </div>
                </div>

                {/* Numéro MonCash */}
                <div className="mt-4">
                  <label
                    htmlFor="withdraw-phone"
                    className="mb-2 block text-[10px] font-bold text-white/45"
                  >
                    Numéro MonCash
                  </label>
                  <input
                    id="withdraw-phone"
                    type="tel"
                    inputMode="numeric"
                    value={withdrawPhone}
                    onChange={(e) => {
                      setWithdrawPhone(e.target.value);
                      setWithdrawMessage(null);
                    }}
                    placeholder="Ex: 38 12 34 56"
                    disabled={withdrawLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] font-black text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/50 focus:bg-blue-600/5 disabled:opacity-50"
                  />
                </div>

                {/* AFFICHAGE DES FRAIS */}
                {withdrawAmount && !isNaN(Number(withdrawAmount)) && Number(withdrawAmount) > 0 && (
                  <div className="mt-4 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 shadow-[0_0_20px_rgba(30,100,255,0.1)]">
                    <p className="text-[9px] font-medium text-white/80">
                      <span className="text-blue-300">💸 Frais de retrait MonCash (5%)</span> :
                      <span className="ml-1 font-black text-white">{(Number(withdrawAmount) * 0.05).toLocaleString('fr-FR')} HTG</span>
                    </p>
                    <p className="mt-1 text-[9px] font-bold">
                      <span className="text-white/50">Vous recevrez sur MonCash : </span>
                      <span className="font-black text-blue-400">{(Number(withdrawAmount) * 0.95).toLocaleString('fr-FR')} HTG</span>
                    </p>
                  </div>
                )}


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


                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-600/20 text-[11px] font-black text-white shadow-[0_4px_0_rgba(20,80,200,0.4),0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-blue-400/60 hover:bg-blue-600/30 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(20,80,200,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {withdrawLoading ? (

                    <>

                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                      Traitement en cours...

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

                  Les frais de retrait (5%) sont déduits automatiquement.
                  <br />
                  Le transfert s'effectue vers votre compte MonCash.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* ==========================================
            NAVIGATION (avec Historique à la place de Notifications)
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

              {t.wallet}

            </button>


            {/* 🔄 HISTORIQUE (remplace Notifications) */}

            <button
              type="button"
              onClick={() => {

                window.location.href =
                  "/historique";

              }}
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >

              <span className="text-[18px]">
                📜
              </span>

              Historique

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