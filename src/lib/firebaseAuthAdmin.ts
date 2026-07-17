import {
  getAuth
} from "firebase-admin/auth";


import {
  getApps,
  initializeApp,
  cert
} from "firebase-admin/app";



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
    process.env.FIREBASE_DATABASE_URL ||
    "https://domino-fad16-default-rtdb.firebaseio.com"

};





const app =

getApps().length

?

getApps()[0]

:

initializeApp(
  firebaseAdminConfig
);





export const adminAuth =
getAuth(app);