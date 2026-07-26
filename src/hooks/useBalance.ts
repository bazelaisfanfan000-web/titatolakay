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
} from "firebase/auth";

import {
  onValue,
  ref,
} from "firebase/database";


export function useBalance() {

  const [
    balance,
    setBalance,
  ] = useState<number>(0);


  const [
    loading,
    setLoading,
  ] = useState<boolean>(true);


  useEffect(() => {

    let unsubscribeBalance:
      (() => void) | null = null;


    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {

          // =====================================
          // UTILISATEUR NON CONNECTÉ
          // =====================================

          if (!user) {

            setBalance(0);

            setLoading(false);

            if (unsubscribeBalance) {

              unsubscribeBalance();

              unsubscribeBalance = null;

            }

            return;

          }


          // =====================================
          // NOUVEAU CHARGEMENT
          // =====================================

          setLoading(true);


          // =====================================
          // RÉFÉRENCE DU SOLDE
          // =====================================

          const balanceRef =
            ref(
              database,
              `users/${user.uid}/balance`
            );


          // =====================================
          // ÉCOUTE TEMPS RÉEL
          // =====================================

          unsubscribeBalance =
            onValue(

              balanceRef,

              (snapshot) => {

                const value =
                  snapshot.val();


                console.log(
                  "💰 SOLDE FIREBASE :",
                  value
                );


                // =================================
                // SOLDE VALIDE
                // =================================

                if (
                  value !== null &&
                  value !== undefined
                ) {

                  const numericBalance =
                    Number(value);


                  setBalance(
                    Number.isFinite(
                      numericBalance
                    )
                      ? numericBalance
                      : 0
                  );

                } else {

                  setBalance(0);

                }


                setLoading(false);

              },


              (error) => {

                console.error(
                  "❌ ERREUR LECTURE SOLDE FIREBASE :",
                  error
                );


                setBalance(0);

                setLoading(false);

              }

            );

        }
      );


    // =========================================
    // NETTOYAGE
    // =========================================

    return () => {

      unsubscribeAuth();


      if (
        unsubscribeBalance
      ) {

        unsubscribeBalance();

        unsubscribeBalance = null;

      }

    };

  }, []);


  return {

    balance,

    loading,

  };

}