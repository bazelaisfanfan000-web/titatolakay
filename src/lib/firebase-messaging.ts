"use client";

import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
} from "firebase/messaging";

import {
  app,
} from "./firebase";


/*
====================================================
INSTANCE FIREBASE MESSAGING
====================================================
*/

let messaging:
  Messaging | null = null;


/*
====================================================
OBTENIR FIREBASE MESSAGING
====================================================
*/

async function getFirebaseMessaging() {

  try {

    // Vérifier si FCM est supporté
    const supported =
      await isSupported();


    if (!supported) {

      console.warn(
        "Firebase Cloud Messaging n'est pas supporté par ce navigateur."
      );

      return null;

    }


    // Créer l'instance une seule fois
    if (!messaging) {

      messaging =
        getMessaging(app);

    }


    return messaging;


  } catch (error) {

    console.error(
      "Erreur initialisation Firebase Messaging:",
      error
    );

    return null;

  }

}


/*
====================================================
DEMANDER PERMISSION + RÉCUPÉRER TOKEN FCM
====================================================
*/

export async function requestNotificationPermission() {

  try {

    /*
    ================================================
    VÉRIFIER NAVIGATEUR
    ================================================
    */

    if (
      typeof window === "undefined"
    ) {

      return null;

    }


    /*
    ================================================
    VÉRIFIER SUPPORT NOTIFICATIONS
    ================================================
    */

    if (
      !("Notification" in window)
    ) {

      console.warn(
        "Les notifications ne sont pas supportées par ce navigateur."
      );

      return null;

    }


    /*
    ================================================
    DEMANDER PERMISSION
    ================================================
    */

    const permission =
      await Notification.requestPermission();


    console.log(
      "Permission notification:",
      permission
    );


    /*
    ================================================
    PERMISSION REFUSÉE
    ================================================
    */

    if (
      permission !== "granted"
    ) {

      console.warn(
        "L'utilisateur a refusé les notifications."
      );

      return null;

    }


    /*
    ================================================
    OBTENIR FIREBASE MESSAGING
    ================================================
    */

    const messagingInstance =
      await getFirebaseMessaging();


    if (!messagingInstance) {

      return null;

    }


    /*
    ================================================
    CLÉ VAPID
    ================================================
    */

    const vapidKey =
      process.env
        .NEXT_PUBLIC_FIREBASE_VAPID_KEY;


    if (!vapidKey) {

      console.error(
        "Erreur : NEXT_PUBLIC_FIREBASE_VAPID_KEY est manquante dans .env.local"
      );

      return null;

    }


    /*
    ================================================
    RÉCUPÉRER TOKEN FCM
    ================================================
    */

    const token =
      await getToken(
        messagingInstance,
        {
          vapidKey,
        }
      );


    /*
    ================================================
    TOKEN INTROUVABLE
    ================================================
    */

    if (!token) {

      console.warn(
        "Impossible de récupérer le token FCM."
      );

      return null;

    }


    /*
    ================================================
    TOKEN RÉCUPÉRÉ
    ================================================
    */

    console.log(
      "FCM TOKEN:",
      token
    );


    return token;


  } catch (error) {

    console.error(
      "Erreur récupération token FCM:",
      error
    );


    return null;

  }

}