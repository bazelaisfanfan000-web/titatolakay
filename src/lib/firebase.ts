"use client";

import {
  initializeApp,
  getApps
} from "firebase/app";

import {
  getAnalytics
} from "firebase/analytics";


import {
  getAuth
} from "firebase/auth";


import {
  getDatabase
} from "firebase/database";


import {
  getFirestore
} from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyCwkDm3s9LAXkWWbpVZpRMMHrTYzYyxyGA",
  authDomain: "titato-64a4d.firebaseapp.com",
  projectId: "titato-64a4d",
  storageBucket: "titato-64a4d.firebasestorage.app",
  messagingSenderId: "942632105982",
  appId: "1:942632105982:web:7ebb5b9a19b5c8d0feb2af",
  measurementId: "G-NKBRW72RSH"
};



const app =
getApps().length
?
getApps()[0]
:
initializeApp(firebaseConfig);

const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;



// Firebase Auth

export const auth =
getAuth(app);



// Realtime Database

export const database =
getDatabase(app);


export const rtdb =
database;



// Alias ancien code

export const db =
database;



// Firestore

export const firestore =
getFirestore(app);