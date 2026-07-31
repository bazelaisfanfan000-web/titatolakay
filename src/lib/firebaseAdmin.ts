import admin from "firebase-admin";


/*
====================================================
FIREBASE ADMIN INITIALISATION
====================================================
*/

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim();


const clientEmail =
  process.env.FIREBASE_CLIENT_EMAIL?.trim();


const privateKey =
  process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();


const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();

// Pour Firebase Admin, on peut aussi utiliser FIREBASE_DATABASE_URL s'il est défini
const adminDatabaseURL =
  process.env.FIREBASE_DATABASE_URL?.trim() || databaseURL;


/*
====================================================
VALIDATION ENVIRONNEMENT
====================================================
*/

if (
  !projectId ||
  !clientEmail ||
  !privateKey ||
  !adminDatabaseURL
) {

  console.error(
    "[FIREBASE ADMIN] Configuration Firebase manquante.",
    {
      hasProjectId:
        Boolean(projectId),

      hasClientEmail:
        Boolean(clientEmail),

      hasPrivateKey:
        Boolean(privateKey),

      hasDatabaseURL:
        Boolean(adminDatabaseURL),
    }
  );

}


/*
====================================================
INITIALISER FIREBASE ADMIN UNE SEULE FOIS
====================================================
*/

if (
  !admin.apps.length
) {

  try {

    admin.initializeApp({

      credential:
        admin.credential.cert({

          projectId,

          clientEmail,

          privateKey,

        }),

      databaseURL: adminDatabaseURL,

    });


    console.log(
      "[FIREBASE ADMIN] Firebase Admin initialisé.",
      {
        projectId,

        databaseURL: adminDatabaseURL,
      }
    );

  } catch (error) {

    console.error(
      "[FIREBASE ADMIN] Erreur d'initialisation:",
      error
    );

  }

}


/*
====================================================
EXPORT AUTH
====================================================
*/

export const adminAuth =
  admin.auth();


/*
====================================================
EXPORT REALTIME DATABASE
====================================================
*/

export const adminDB =
  admin.database();


/*
====================================================
EXPORT FIREBASE CLOUD MESSAGING
====================================================
*/

export const adminMessaging =
  admin.messaging();