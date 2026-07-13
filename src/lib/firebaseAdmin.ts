import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";


const firebaseAdmin =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),

        databaseURL: "https://domino-fad16-default-rtdb.firebaseio.com",
      })
    : getApps()[0];


export const adminDB = getDatabase(firebaseAdmin);

export const adminAuth = getAuth(firebaseAdmin);