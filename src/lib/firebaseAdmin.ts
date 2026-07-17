// src/lib/firebaseAdmin.ts
// Firebase Admin SDK initialization for Next.js 16 + Vercel

import {
  cert,
  getApps,
  initializeApp
} from "firebase-admin/app";

import {
  getDatabase
} from "firebase-admin/database";

import {
  getAuth
} from "firebase-admin/auth";


// ===============================
// FIREBASE ADMIN CONFIG
// ===============================

const firebaseAdminConfig = {

  credential: cert({

    projectId: process.env.FIREBASE_PROJECT_ID || "domino-fad16",

    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,

    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),

  }),

  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://domino-fad16-default-rtdb.firebaseio.com",

};


// ===============================
// INITIALISATION UNIQUE (SERVER-ONLY)
// ===============================

let firebaseAdmin: any = null;

// Only initialize on server-side, not during build
if (typeof window === "undefined") {
  try {
    // Check required environment variables
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.error("[FIREBASE ADMIN] FIREBASE_PRIVATE_KEY environment variable not set");
      console.error("[FIREBASE ADMIN] Add this variable in Vercel Settings > Environment Variables");
    }
    
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      console.error("[FIREBASE ADMIN] FIREBASE_CLIENT_EMAIL environment variable not set");
      console.error("[FIREBASE ADMIN] Add this variable in Vercel Settings > Environment Variables");
    }
    
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Firebase Admin environment variables missing");
    }
    
    // Initialize Firebase Admin
    firebaseAdmin = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseAdminConfig);
    console.log("[FIREBASE ADMIN] Initialized successfully");
  } catch (error: any) {
    console.error("[FIREBASE ADMIN] Initialization failed:", error.message);
    console.error("[FIREBASE ADMIN] Check Vercel environment variables");
    firebaseAdmin = null;
  }
}


// ===============================
// EXPORT SERVICES
// ===============================

export const adminDB = firebaseAdmin ? getDatabase(firebaseAdmin) : null as any;

export const adminAuth = firebaseAdmin ? getAuth(firebaseAdmin) : null as any;
