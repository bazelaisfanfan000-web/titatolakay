import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminDB,
  adminAuth,
} from "@/lib/firebaseAdmin";


/*
====================================================
GET CHECK RULES ACCEPTED
====================================================
*/

export async function GET(
  request: Request
) {

  try {

    /*
    ================================================
    VÉRIFIER FIREBASE ADMIN
    ================================================
    */

    if (!adminAuth || !adminDB) {

      console.error(
        "CHECK RULES: Firebase Admin non initialisé"
      );

      return NextResponse.json(

        {
          success: false,

          error:
            "Service Firebase non disponible. Réessayez plus tard.",
        },

        {
          status: 503,
        }

      );

    }


    /*
    ================================================
    AUTHORIZATION HEADER
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
            "Token manquant",
        },

        {
          status: 401,
        }

      );

    }


    const token =
      authHeader
        .replace(
          "Bearer ",
          ""
        )
        .trim();


    if (!token) {

      return NextResponse.json(

        {
          success: false,

          error:
            "Token vide",
        },

        {
          status: 401,
        }

      );

    }


    /*
    ================================================
    VÉRIFIER TOKEN FIREBASE
    ================================================
    */

    let decoded;

    try {

      decoded =
        await adminAuth.verifyIdToken(
          token
        );

    } catch (error) {

      console.error(
        "FIREBASE AUTH ERROR:",
        error
      );


      return NextResponse.json(

        {
          success: false,

          error:
            "Token Firebase invalide",
        },

        {
          status: 401,
        }

      );

    }


    const uid =
      decoded.uid;


    /*
    ================================================
    VÉRIFIER SI RÈGLES ACCEPTÉES
    ================================================
    */

    const rulesRef =
      adminDB.ref(
        `users/${uid}/rulesAccepted`
      );

    const snapshot =
      await rulesRef.get();


    const accepted =
      snapshot.exists() &&
      snapshot.val() === true;


    return NextResponse.json(

      {
        success: true,

        accepted,

        alreadyAccepted: accepted,

      },

      {
        status: 200,
      }

    );


  } catch (
    error: any
  ) {

    /*
    ================================================
    ERREUR GLOBALE
    ================================================
    */

    console.error(
      "CHECK RULES CRASH:",
      error
    );


    return NextResponse.json(

      {

        success: false,

        error:
          error?.message ||
          "Erreur serveur vérification règles",

      },

      {

        status: 500,

      }

    );

  }

}


/*
====================================================
POST ACCEPT RULES
====================================================
*/

export async function POST(
  request: Request
) {

  try {

    /*
    ================================================
    VÉRIFIER FIREBASE ADMIN
    ================================================
    */

    if (!adminAuth || !adminDB) {

      console.error(
        "ACCEPT RULES: Firebase Admin non initialisé"
      );

      return NextResponse.json(

        {
          success: false,

          error:
            "Service Firebase non disponible. Réessayez plus tard.",
        },

        {
          status: 503,
        }

      );

    }


    /*
    ================================================
    AUTHORIZATION HEADER
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
            "Token manquant",
        },

        {
          status: 401,
        }

      );

    }


    const token =
      authHeader
        .replace(
          "Bearer ",
          ""
        )
        .trim();


    if (!token) {

      return NextResponse.json(

        {
          success: false,

          error:
            "Token vide",
        },

        {
          status: 401,
        }

      );

    }


    /*
    ================================================
    VÉRIFIER TOKEN FIREBASE
    ================================================
    */

    let decoded;

    try {

      decoded =
        await adminAuth.verifyIdToken(
          token
        );

    } catch (error) {

      console.error(
        "FIREBASE AUTH ERROR:",
        error
      );


      return NextResponse.json(

        {
          success: false,

          error:
            "Token Firebase invalide",
        },

        {
          status: 401,
        }

      );

    }


    const uid =
      decoded.uid;


    console.log(
      "ACCEPT RULES:",
      {
        uid,
      }
    );


    /*
    ================================================
    VÉRIFIER SI DÉJÀ ACCEPTÉ
    ================================================
    */

    const rulesRef =
      adminDB.ref(
        `users/${uid}/rulesAccepted`
      );

    const snapshot =
      await rulesRef.get();


    if (
      snapshot.exists() &&
      snapshot.val() === true
    ) {

      return NextResponse.json(

        {
          success: true,

          message:
            "Règles déjà acceptées",

          alreadyAccepted: true,

        },

        {
          status: 200,
        }

      );

    }


    /*
    ================================================
    ENREGISTRER ACCEPTATION
    ================================================
    */

    const now =
      Date.now();


    await adminDB.ref(
      `users/${uid}/rulesAccepted`
    ).set(
      true
    );

    await adminDB.ref(
      `users/${uid}/rulesAcceptedAt`
    ).set(
      now
    );


    console.log(
      "RULES ACCEPTED:",
      {
        uid,
        timestamp: now,
      }
    );


    /*
    ================================================
    RÉPONSE SUCCÈS
    ================================================
    */

    const response =
      NextResponse.json(

        {
          success: true,

          message:
            "Règles acceptées avec succès",

        },

        {
          status: 200,
        }

      );


    /*
    ================================================
    DÉFINIR COOKIE POUR MIDDLEWARE
    ================================================
    */

    response.cookies.set(
      "rules-accepted",
      "true",
      {
        path: "/",
        maxAge: 31536000, // 1 an
        httpOnly: false,
        secure: true,
        sameSite: "strict",
      }
    );


    return response;


  } catch (
    error: any
  ) {

    /*
    ================================================
    ERREUR GLOBALE
    ================================================
    */

    console.error(
      "ACCEPT RULES CRASH:",
      error
    );


    return NextResponse.json(

      {

        success: false,

        error:
          error?.message ||
          "Erreur serveur acceptation règles",

      },

      {

        status: 500,

      }

    );

  }

}
