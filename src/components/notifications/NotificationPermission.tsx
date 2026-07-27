"use client";

import {
  useEffect,
} from "react";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import {
  auth,
} from "@/lib/firebase";

import {
  requestNotificationPermission,
} from "@/lib/firebase-messaging";


/*
====================================================
ENREGISTRER LE TOKEN FCM SUR LE SERVEUR
====================================================
*/

async function registerFCMToken(
  user: User,
  fcmToken: string
) {

  try {

    /*
    ================================================
    RÉCUPÉRER LE TOKEN FIREBASE AUTH
    ================================================
    */

    const idToken =
      await user.getIdToken();


    /*
    ================================================
    ENVOYER LE TOKEN AU SERVEUR
    ================================================
    */

    const response =
      await fetch(
        "/api/notifications/register-token",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${idToken}`,

          },

          body:
            JSON.stringify({

              token:
                fcmToken,

            }),

        }
      );


    /*
    ================================================
    LIRE LA RÉPONSE
    ================================================
    */

    const data =
      await response.json();


    /*
    ================================================
    VÉRIFIER LA RÉPONSE
    ================================================
    */

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(

        data?.error ||
        "Impossible d'enregistrer le token FCM"

      );

    }


    console.log(
      "✅ Token FCM enregistré avec succès"
    );


    return true;


  } catch (error) {

    console.error(
      "❌ Erreur enregistrement token FCM:",
      error
    );


    return false;

  }

}


/*
====================================================
COMPOSANT NOTIFICATION FCM
====================================================
*/

export default function NotificationPermission() {


  /*
  ================================================
  INITIALISER FCM
  ================================================
  */

  useEffect(() => {

    let unsubscribe:
      (() => void) | null = null;


    const initializeNotifications =
      async () => {


        /*
        ============================================
        VÉRIFIER SUPPORT NAVIGATEUR
        ============================================
        */

        if (
          typeof window === "undefined"
        ) {

          return;

        }


        /*
        ============================================
        VÉRIFIER SERVICE WORKER
        ============================================
        */

        if (
          !("serviceWorker" in navigator)
        ) {

          console.warn(
            "Service Worker non supporté."
          );

          return;

        }


        /*
        ============================================
        ATTENDRE LE SERVICE WORKER FCM
        ============================================
        */

        try {

          await navigator.serviceWorker.register(

            "/firebase-messaging-sw.js"

          );

          console.log(
            "✅ Firebase Messaging Service Worker enregistré"
          );

        } catch (error) {

          console.error(
            "❌ Erreur Service Worker FCM:",
            error
          );

          return;

        }


        /*
        ============================================
        ÉCOUTER L'ÉTAT DE CONNEXION
        ============================================
        */

        unsubscribe =
          onAuthStateChanged(

            auth,

            async (
              user
            ) => {

              /*
              ======================================
              UTILISATEUR NON CONNECTÉ
              ======================================
              */

              if (!user) {

                console.log(
                  "Aucun utilisateur connecté."
                );

                return;

              }


              console.log(
                "Utilisateur connecté:",
                user.uid
              );


              /*
              ======================================
              DEMANDER PERMISSION
              ======================================
              */

              const fcmToken =
                await requestNotificationPermission();


              /*
              ======================================
              TOKEN NON DISPONIBLE
              ======================================
              */

              if (!fcmToken) {

                console.warn(
                  "Aucun token FCM disponible."
                );

                return;

              }


              /*
              ======================================
              ENREGISTRER TOKEN
              ======================================
              */

              await registerFCMToken(

                user,

                fcmToken

              );

            }

          );

      };


    /*
    ================================================
    LANCER INITIALISATION
    ================================================
    */

    initializeNotifications();


    /*
    ================================================
    NETTOYAGE
    ================================================
    */

    return () => {

      if (unsubscribe) {

        unsubscribe();

      }

    };

  }, []);


  /*
  ================================================
  CE COMPOSANT N'A PAS D'INTERFACE
  ================================================
  */

  return null;

}