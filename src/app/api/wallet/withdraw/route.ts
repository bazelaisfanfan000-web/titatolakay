/*
====================================================
TiTaTo - Create Withdrawal API Route
====================================================

Endpoint :

POST /api/withdrawals

Headers :

Authorization: Bearer <Firebase ID Token>

Body :

{
  "amount": 1000,
  "moncashNumber": "509xxxxxxxx"
}

IMPORTANT :

Le UID n'est JAMAIS accepté depuis le body.

Le UID est récupéré depuis le token Firebase
vérifié côté serveur.

====================================================
*/


import {
  NextRequest,
  NextResponse,
} from "next/server";


import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";


import {
  createWithdrawal,
} from "@/lib/withdrawals/service";


/*
====================================================
TYPES
====================================================
*/


interface AuthenticatedUser {

  uid: string;

  email?: string;

  phoneNumber?: string;
}


/*
====================================================
EXTRAIRE LE TOKEN FIREBASE
====================================================
*/


function extractBearerToken(
  request: NextRequest,
): string | null {

  /*
  Récupère le header Authorization.
  */

  const authorization =
    request.headers.get(
      "authorization",
    );


  /*
  Aucun header.
  */

  if (
    !authorization
  ) {
    return null;
  }


  /*
  Vérifie le format :

  Bearer TOKEN
  */

  if (
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }


  /*
  Extrait uniquement le token.
  */

  const token =
    authorization
      .slice(
        7,
      )
      .trim();


  if (
    token.length === 0
  ) {
    return null;
  }


  return token;
}


/*
====================================================
AUTHENTIFIER L'UTILISATEUR
====================================================
*/


async function authenticateRequest(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {

  /*
  Extrait le token.
  */

  const token =
    extractBearerToken(
      request,
    );


  if (
    !token
  ) {
    return null;
  }


  try {

    /*
    Vérification du token Firebase
    côté serveur.

    IMPORTANT :

    Cette fonction utilise Firebase Admin.
    */

    const decodedToken =
      await adminAuth
        .verifyIdToken(
          token,
        );


    /*
    Retourne uniquement les informations
    nécessaires.
    */

    return {

      uid:
        decodedToken.uid,

      email:
        decodedToken.email,

      phoneNumber:
        decodedToken.phone_number,
    };


  } catch (
    error
  ) {

    console.error(
      "[WITHDRAWAL_AUTH_ERROR]",
      error,
    );


    return null;
  }
}


/*
====================================================
VÉRIFIER LE COMPTE UTILISATEUR
====================================================

Cette fonction vérifie que le compte existe
toujours dans Firebase.

Elle permet également de vérifier si le compte
est bloqué ou désactivé.

====================================================
*/


async function verifyUserAccount(
  uid: string,
): Promise<boolean> {

  const db =
    adminDB;


  try {

    const snapshot =
      await db
        .ref(
          `users/${uid}`,
        )
        .get();


    /*
    L'utilisateur doit exister.
    */

    if (
      !snapshot.exists()
    ) {
      return false;
    }


    const user =
      snapshot.val() as Record<
        string,
        unknown
      >;


    /*
    Vérification optionnelle du statut.

    Si ton système utilise :

    status: "active"

    alors on bloque les comptes
    dont le statut n'est pas actif.

    Si aucun champ status n'existe,
    on autorise par défaut.

    */

    if (
      typeof user.status ===
      "string"
    ) {

      if (
        user.status !==
        "active"
      ) {

        return false;
      }
    }


    /*
    Vérification d'un éventuel compte
    explicitement désactivé.
    */

    if (
      user.disabled ===
      true
    ) {

      return false;
    }


    return true;


  } catch (
    error
  ) {

    console.error(
      "[WITHDRAWAL_USER_CHECK_ERROR]",
      error,
    );


    return false;
  }
}


/*
====================================================
POST
====================================================
*/


export async function POST(
  request: NextRequest,
) {

  /*
  --------------------------------------------------
  ÉTAPE 1
  AUTHENTIFICATION
  --------------------------------------------------
  */

  const user =
    await authenticateRequest(
      request,
    );


  if (
    !user
  ) {

    return NextResponse.json(

      {
        success:
          false,

        error:
          "Authentification requise.",
      },

      {
        status:
          401,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 2
  VÉRIFIER LE COMPTE
  --------------------------------------------------
  */

  const accountIsValid =
    await verifyUserAccount(
      user.uid,
    );


  if (
    !accountIsValid
  ) {

    return NextResponse.json(

      {
        success:
          false,

        error:
          "Votre compte n'est pas autorisé à effectuer un retrait.",
      },

      {
        status:
          403,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 3
  LIRE LE BODY
  --------------------------------------------------
  */

  let body: unknown;


  try {

    body =
      await request.json();

  } catch (
    error
  ) {

    console.error(
      "[WITHDRAWAL_BODY_ERROR]",
      error,
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Le corps de la requête est invalide.",
      },

      {
        status:
          400,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 4
  CRÉER LE RETRAIT
  --------------------------------------------------

  IMPORTANT :

  On ne passe PAS le UID du body.

  Le UID vient exclusivement
  du token Firebase vérifié.

  --------------------------------------------------
  */

  try {

    const result =
      await createWithdrawal(

        user.uid,

        body,

      );


    /*
    ------------------------------------------------
    SUCCÈS
    ------------------------------------------------
    */

    if (
      result.success
    ) {

      return NextResponse.json(

        {
          success:
            true,

          withdrawalId:
            result.withdrawalId,

          status:
            result.status,

          message:
            result.message ??
            "Votre demande de retrait a été créée.",
        },

        {
          status:
            201,
        },

      );
    }


    /*
    ------------------------------------------------
    ÉCHEC MÉTIER
    ------------------------------------------------

    Exemple :

    Solde insuffisant
    Retrait déjà en cours
    Limite atteinte
    Numéro invalide

    ------------------------------------------------
    */

    return NextResponse.json(

      {
        success:
          false,

        withdrawalId:
          result.withdrawalId,

        status:
          result.status,

        error:
          result.error ??
          "Impossible de créer le retrait.",
      },

      {
        status:
          400,
      },

    );


  } catch (
    error
  ) {

    /*
    ------------------------------------------------
    ERREUR SERVEUR
    ------------------------------------------------
    */

    console.error(
      "[WITHDRAWAL_CREATE_ERROR]",
      {
        uid:
          user.uid,

        error,
      },
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Une erreur interne est survenue lors de la création du retrait.",
      },

      {
        status:
          500,
      },

    );
  }
}


/*
====================================================
MÉTHODE GET
====================================================

Cette route ne crée pas de retrait.

Elle retourne simplement une information
indiquant que l'endpoint existe.

Le frontend ne doit pas utiliser GET
pour effectuer un retrait.

====================================================
*/


export async function GET() {

  return NextResponse.json(

    {
      success:
        true,

      service:
        "TiTaTo Withdrawals",

      message:
        "Utilisez POST /api/withdrawals pour créer une demande de retrait.",
    },

    {
      status:
        200,
    },

  );
}