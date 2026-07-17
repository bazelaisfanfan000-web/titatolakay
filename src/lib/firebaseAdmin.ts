// src/lib/firebaseAdmin.ts


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





const firebaseAdminConfig = {


  credential: cert({

    projectId:
      process.env.FIREBASE_PROJECT_ID,


    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,


    privateKey:
      process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g,"\n"),


  }),



  databaseURL:

    process.env.FIREBASE_DATABASE_URL
    ||

    "https://domino-fad16-default-rtdb.firebaseio.com"



};







const firebaseAdmin =


getApps().length === 0


?


initializeApp(
  firebaseAdminConfig
)


:


getApps()[0];







export const adminDB =

getDatabase(
  firebaseAdmin
);






export const adminAuth =

getAuth(
  firebaseAdmin
);