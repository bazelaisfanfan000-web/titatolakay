import {
  NextResponse,
} from "next/server";

import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


/*
====================================================
ENREGISTRER UN TOKEN FCM
====================================================

POST /api/notifications/register-token

Body:

{
  "token": "FCM_TOKEN"
}

Le token sera enregistré ici :

users
└── USER_ID
    └── fcmTokens
        └── TOKEN_ID
            ├── token
            ├── createdAt
            └── updatedAt

====================================================
*/


export async function POST(
  request: Request
) {

  try {

    /*
    ================================================
    1. VÉRIFIER LE TOKEN FIREBASE AUTH
    ================================================
    */

    const authHeader =
      request.headers.get(
        "authorization"
      );


    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return NextResponse.json(

        {
          success: false,
          error:
            "Token Firebase manquant",
        },

        {
          status: 401,
        }

      );

    }


    const idToken =
      authHeader
        .replace(
          "Bearer ",
          ""
        )
        .trim();


    if (!idToken) {

      return NextResponse.json(

        {
          success: false,
          error:
            "Token Firebase vide",
        },

        {
          status: 401,
        }

      );

    }


    /*
    ================================================
    2. VÉRIFIER L'UTILISATEUR
    ================================================
    */

    let decodedToken;

    try {

      decodedToken =
        await adminAuth.verifyIdToken(
          idToken
        );

    } catch (error) {

      console.error(
        "FCM AUTH ERROR:",
        error
      );


      return NextResponse.json(

        {
          success: false,
          error:
            "Token Firebase invalide ou expiré",
        },

        {
          status: 401,
        }

      );

    }


    const uid =
      decodedToken.uid;


    /*
    ================================================
    3. LIRE LE FCM TOKEN
    ================================================
    */

    const body =
      await request.json();


    const fcmToken =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";


    /*
    ================================================
    4. VÉRIFIER LE FCM TOKEN
    ================================================
    */

    if (!fcmToken) {

      return NextResponse.json(

        {
          success: false,
          error:
            "FCM Token manquant",
        },

        {
          status: 400,
        }

      );

    }


    /*
    ================================================
    5. VALIDATION BASIQUE
    ================================================
    */

    if (
      fcmToken.length < 20
    ) {

      return NextResponse.json(

        {
          success: false,
          error:
            "FCM Token invalide",
        },

        {
          status: 400,
        }

      );

    }


    /*
    ================================================
    6. CRÉER UNE RÉFÉRENCE UNIQUE
    ================================================
    */

    const tokenKey =
      Buffer
        .from(
          fcmToken
        )
        .toString(
          "base64url"
        )
        .replace(
          /[.#$[\]]/g,
          "_"
        );


    /*
    ================================================
    7. RÉFÉRENCE FIREBASE
    ================================================
    */

    const tokenRef =
      adminDB.ref(
        `users/${uid}/fcmTokens/${tokenKey}`
      );


    /*
    ================================================
    8. VÉRIFIER SI LE TOKEN EXISTE
    ================================================
    */

    const existingSnapshot =
      await tokenRef.once(
        "value"
      );


    const now =
      Date.now();


    /*
    ================================================
    9. ENREGISTRER LE TOKEN
    ================================================
    */

    if (
      existingSnapshot.exists()
    ) {

      await tokenRef.update({

        token:
          fcmToken,

        updatedAt:
          now,

      });

    } else {

      await tokenRef.set({

        token:
          fcmToken,

        createdAt:
          now,

        updatedAt:
          now,

      });

    }


    /*
    ================================================
    10. RÉPONSE
    ================================================
    */

    return NextResponse.json(

      {
        success: true,

        message:
          "Token FCM enregistré avec succès",

        uid,

      },

      {
        status: 200,
      }

    );


  } catch (error) {

    console.error(
      "REGISTER FCM TOKEN ERROR:",
      error
    );


    return NextResponse.json(

      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur serveur",

      },

      {
        status: 500,
      }

    );

  }

}