import {
  getApps,
  initializeApp,
  cert
} from "firebase-admin/app";


import {
  getAuth
} from "firebase-admin/auth";



// ===============================
// FIREBASE AUTH ADMIN ONLY
// ===============================


const firebaseAuthConfig = {


  credential: cert({

    projectId:
      process.env.FIREBASE_PROJECT_ID,


    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,


    privateKey:
      process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n")

  })

};




// ===============================
// INIT UNIQUE
// ===============================


const app =

getApps().length

?

getApps()[0]

:

initializeApp(
  firebaseAuthConfig
);




// ===============================
// EXPORT AUTH
// ===============================


export const adminAuth =
getAuth(app);