/* =====================================================
   Wincash - FIREBASE CLOUD MESSAGING SERVICE WORKER
   Compatible: iOS Safari, Android Chrome, Desktop Chrome/Edge
   ===================================================== */


/*
=========================================================
IMPORTER FIREBASE COMPAT
=========================================================
*/

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);


/*
=========================================================
DÉTECTION PLATEFORME
=========================================================
*/

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /android/i.test(navigator.userAgent);


/*
=========================================================
CONFIGURATION FIREBASE
=========================================================
*/

firebase.initializeApp({

  apiKey:
    "AIzaSyCwkDm3s9LAXkWWbpVZpRMMHrTYzYyxyGA",

  authDomain:
    "titato-64a4d.firebaseapp.com",

  projectId:
    "titato-64a4d",

  storageBucket:
    "titato-64a4d.firebasestorage.app",

  messagingSenderId:
    "942632105982",

  appId:
    "1:942632105982:web:7ebb5b9a19b5c8d0feb2af",

  measurementId:
    "G-NKBRW72RSH",

});


/*
=========================================================
INITIALISER FIREBASE MESSAGING
=========================================================
*/

const messaging =
  firebase.messaging();


/*
=========================================================
RECEVOIR LES NOTIFICATIONS EN ARRIÈRE-PLAN
=========================================================
*/

messaging.onBackgroundMessage(
  function(payload) {

    console.log(
      "[firebase-messaging-sw.js] Notification reçue:",
      payload
    );


    /*
    =====================================================
    RÉCUPÉRER LES DONNÉES
    =====================================================
    */

    const notification =
      payload.notification || {};


    const data =
      payload.data || {};


    /*
    =====================================================
    TITRE
    =====================================================
    */

    const title =
      notification.title ||
      data.title ||
      "🎮 Wincash";


    /*
    =====================================================
    MESSAGE
    =====================================================
    */

    const body =
      notification.body ||
      data.body ||
      data.message ||
      "Une nouvelle partie est disponible !";


    /*
    =====================================================
    GAME ID / ROOM ID
    =====================================================
    */

    const gameId =
      data.gameId ||
      data.roomId ||
      "";


    /*
    =====================================================
    LIEN
    =====================================================
    */

    const link =
      data.link ||
      (
        gameId
          ? `/join/${gameId}`
          : "/dashboard"
      );


    /*
    =====================================================
    OPTIONS NOTIFICATION
    =====================================================
    */

    const notificationOptions = {

      body,

      icon:
        "/icon-192.png",

      badge:
        "/icon-192.png",

      data: {

        link,

        gameId,

        type:
          data.type ||
          "general",

      },

    };


    /*
    =====================================================
    AFFICHER NOTIFICATION
    =====================================================
    */

    return self.registration.showNotification(

      title,

      notificationOptions

    );

  }
);


/*
=========================================================
CLIQUER SUR LA NOTIFICATION
=========================================================
*/

self.addEventListener(

  "notificationclick",

  function(event) {

    console.log(
      "[firebase-messaging-sw.js] Notification cliquée"
    );


    /*
    =====================================================
    FERMER LA NOTIFICATION
    =====================================================
    */

    event.notification.close();


    /*
    =====================================================
    RÉCUPÉRER LE LIEN
    =====================================================
    */

    const data =
      event.notification.data || {};


    const gameId =
      data.gameId ||
      data.roomId ||
      "";


    const link =
      data.link ||
      (
        gameId
          ? `/join/${gameId}`
          : "/dashboard"
      );


    /*
    =====================================================
    CONSTRUIRE URL COMPLÈTE
    =====================================================
    */

    const url =
      new URL(
        link,
        self.location.origin
      ).href;


    /*
    =====================================================
    OUVRIR OU FOCUS TI TATO
    =====================================================
    */

    event.waitUntil(

      clients
        .matchAll({

          type:
            "window",

          includeUncontrolled:
            true,

        })

        .then(
          function(
            clientList
          ) {


            /*
            =============================================
            SI Wincash EST DÉJÀ OUVERT
            =============================================
            */

            for (
              const client
              of clientList
            ) {

              if (
                "focus" in client
              ) {

                return client
                  .navigate(url)
                  .then(
                    function() {

                      return client.focus();

                    }
                  );

              }

            }


            /*
            =============================================
            SINON OUVRIR Wincash
            =============================================
            */

            if (
              clients.openWindow
            ) {

              return clients.openWindow(
                url
              );

            }

          }
        )

    );

  }

);