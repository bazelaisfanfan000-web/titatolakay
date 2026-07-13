// src/lib/firebase.ts


import {
  initializeApp,
  getApps
} from "firebase/app";


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

  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID

};






const app =
  getApps().length === 0

  ?

  initializeApp(firebaseConfig)

  :

  getApps()[0];







const auth =
  getAuth(app);







const database =
  getDatabase(app);




// Nouveau nom utilisé par certains fichiers

const rtdb =
  database;







const db =
  getFirestore(app);







export {

  app,

  auth,

  database,

  rtdb,

  db

};