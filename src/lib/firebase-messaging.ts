"use client";

import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
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

/*
====================================================
ABONNER UTILISATEUR À UN TOPIC
====================================================
*/

export async function subscribeToTopic(topic: string) {

  try {

    /*
    ================================================
    VÉRIFIER NAVIGATEUR
    ================================================
    */

    if (
      typeof window === "undefined"
    ) {

      return { success: false, error: "Not in browser" };

    }


    /*
    ================================================
    OBTENIR FIREBASE MESSAGING
    ================================================
    */

    const messagingInstance =
      await getFirebaseMessaging();


    if (!messagingInstance) {

      return { success: false, error: "Messaging not supported" };

    }


    /*
    ================================================
    RÉCUPÉRER TOKEN FCM
    ================================================
    */

    const vapidKey =
      process.env
        .NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {

      return { success: false, error: "VAPID key missing" };

    }


    const token =
      await getToken(
        messagingInstance,
        { vapidKey }
      );


    if (!token) {

      return { success: false, error: "No FCM token" };

    }


    /*
    ================================================
    ABONNER AU TOPIC VIA API SERVEUR
    ================================================
    */

    const response =
      await fetch(
        "/api/notifications/subscribe-topic",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              token,
              topic,
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {

      console.error(
        "Topic subscription failed:",
        result
      );

      return {
        success: false,
        error:
          result.error ||
          "Subscription failed"
      };

    }


    console.log(
      `Subscribed to topic: ${topic}`
    );


    return {
      success: true,
      topic,
    };


  } catch (error) {

    console.error(
      "Error subscribing to topic:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error"
    };

  }

}

/*
====================================================
DÉSABONNER UTILISATEUR D'UN TOPIC
====================================================
*/

export async function unsubscribeFromTopic(topic: string) {

  try {

    /*
    ================================================
    VÉRIFIER NAVIGATEUR
    ================================================
    */

    if (
      typeof window === "undefined"
    ) {

      return { success: false, error: "Not in browser" };

    }


    /*
    ================================================
    OBTENIR FIREBASE MESSAGING
    ================================================
    */

    const messagingInstance =
      await getFirebaseMessaging();


    if (!messagingInstance) {

      return { success: false, error: "Messaging not supported" };

    }


    /*
    ================================================
    RÉCUPÉRER TOKEN FCM
    ================================================
    */

    const vapidKey =
      process.env
        .NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {

      return { success: false, error: "VAPID key missing" };

    }


    const token =
      await getToken(
        messagingInstance,
        { vapidKey }
      );


    if (!token) {

      return { success: false, error: "No FCM token" };

    }


    /*
    ================================================
    DÉSABONNER DU TOPIC VIA API SERVEUR
    ================================================
    */

    const response =
      await fetch(
        "/api/notifications/unsubscribe-topic",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              token,
              topic,
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {

      console.error(
        "Topic unsubscription failed:",
        result
      );

      return {
        success: false,
        error:
          result.error ||
          "Unsubscription failed"
      };

    }


    console.log(
      `Unsubscribed from topic: ${topic}`
    );


    return {
      success: true,
      topic,
    };


  } catch (error) {

    console.error(
      "Error unsubscribing from topic:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error"
    };

  }

}

/*
====================================================
ÉCOUTER LES NOTIFICATIONS EN PREMIER PLAN
====================================================
*/

export async function onForegroundMessage(
  callback: (payload: any) => void
) {

  const messagingInstance =
    await getFirebaseMessaging();


  if (messagingInstance) {

    return onMessage(
      messagingInstance,
      callback
    );

  }


  return () => {};

}