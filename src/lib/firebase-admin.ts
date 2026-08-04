import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

// Configuration Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: "titato-64a4d",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://titato-64a4d-default-rtdb.firebaseio.com",
};

// Initialiser l'app Firebase Admin
const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseAdminConfig);

// Exporter les services
export const adminAuth = getAuth(adminApp);
export const adminDb = getDatabase(adminApp);
