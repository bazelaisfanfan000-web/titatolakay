"use client";

import {
  initializeApp,
  getApps,
} from "firebase/app";

import {
  getAnalytics,
} from "firebase/analytics";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  getDatabase,
} from "firebase/database";

import {
  getFirestore,
} from "firebase/firestore";

import {
  getMessaging,
  getToken,
  onMessage,
} from "firebase/messaging";


const firebaseConfig = {

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

};


const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

console.log("[FIREBASE] App initialized:", app.name);
console.log("[FIREBASE] Config:", firebaseConfig);


// =========================================
// EXPORT APP
// =========================================

export {
  app,
};


// =========================================
// ANALYTICS
// =========================================

export const analytics =
  typeof window !== "undefined"
    ? getAnalytics(app)
    : null;


// =========================================
// FIREBASE AUTH
// =========================================

export const auth =
  getAuth(app);

// Configuration de la persistance : localStorage pour ne jamais déconnecter automatiquement
// La session persiste même après fermeture du navigateur
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("[FIREBASE] Persistence set to LOCAL (never auto-logout)");
    })
    .catch((error) => {
      console.error("[FIREBASE] Error setting persistence:", error);
    });
}

console.log("[FIREBASE] Auth initialized:", auth.app.name);


// =========================================
// REALTIME DATABASE
// =========================================

export const database =
  getDatabase(
    app,
    "https://titato-64a4d-default-rtdb.firebaseio.com"
  );


// =========================================
// ALIAS DATABASE
// =========================================

export const rtdb =
  database;

export const db =
  database;


// =========================================
// FIRESTORE
// =========================================

export const firestore =
  getFirestore(app);


// =========================================
// MESSAGING
// =========================================

export const messaging =
  typeof window !== "undefined"
    ? getMessaging(app)
    : null;

export {
  getToken,
  onMessage,
};