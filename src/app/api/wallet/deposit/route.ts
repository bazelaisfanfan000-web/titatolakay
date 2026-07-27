import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "crypto";

import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";


/*
====================================================
CONFIGURATION NEXT.JS
====================================================
*/

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


/*
====================================================
CONSTANTES
====================================================
*/

const MONCASH_CREATE_URL =
  "https://api.moncashconnect.com/v1/pay-create";


/*
====================================================
DÉPÔT MINIMUM
====================================================
*/

const MIN_DEPOSIT_AMOUNT =
  25;


/*
====================================================
DÉPÔT MAXIMUM
====================================================
*/

const MAX_DEPOSIT_AMOUNT =
  100000;


/*
====================================================
MULTIPLICATEUR DE MISE
====================================================

Pour un dépôt de :

100 HTG

Le joueur devra générer :

100 × 2 = 200 HTG

de mise avant de pouvoir retirer.

====================================================
*/

const DEPOSIT_TURNOVER_MULTIPLIER =
  2;


/*
====================================================
TYPES
====================================================
*/

type DepositStatus =
  | "pending"
  | "failed";


type DepositRecord = {

  uid:
    string;

  amount:
    number;

  currency:
    "HTG";

  status:
    DepositStatus;

  provider:
    "moncashconnect";

  referenceId:
    string;

  idempotencyKey:
    string;

  paymentUrl:
    string |
    null;

  createdAt:
    number;

  updatedAt:
    number;

  failedAt?:
    number;

  errorCode?:
    string;

  /*
  ================================================
  RÈGLE DE MISE
  ================================================
  */

  turnoverMultiplier?:
    number;

  turnoverRequired?:
    number;

};


/*
====================================================
RÉPONSE MONCASHCONNECT
====================================================
*/

type MonCashCreateResponse = {

  success?:
    boolean;

  paymentUrl?:
    string;

  referenceId?:
    string;

  transactionId?:
    string;

  id?:
    string;

  error?:
    string;

  message?:
    string;

};


/*
====================================================
UTILITAIRE RÉPONSE ERREUR
====================================================
*/

function errorResponse(
  message: string,
  status: number
) {

  return NextResponse.json(
    {
      success:
        false,

      error:
        message,
    },
    {
      status,
    }
  );

}


/*
====================================================
POST /api/wallet/deposit
====================================================
*/

export async function POST(
  request: NextRequest
) {

  /*
  ==================================================
  1. CLÉ MONCASHCONNECT
  ==================================================
  */

  const moncashApiKey =
    process.env.MCC_KEY;


  if (
    !moncashApiKey
  ) {

    console.error(
      "[DEPOSIT] MCC_KEY manquante."
    );


    return errorResponse(
      "Configuration du paiement manquante.",
      500
    );

  }


  /*
  ==================================================
  2. URL APPLICATION
  ==================================================
  */

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL;


  if (
    !appUrl
  ) {

    console.error(
      "[DEPOSIT] NEXT_PUBLIC_APP_URL manquante."
    );


    return errorResponse(
      "Configuration de l'application manquante.",
      500
    );

  }


  /*
  ==================================================
  3. VÉRIFIER AUTHORIZATION
  ==================================================
  */

  const authorization =
    request.headers.get(
      "authorization"
    );


  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {

    return errorResponse(
      "Authentification requise.",
      401
    );

  }


  /*
  ==================================================
  4. RÉCUPÉRER TOKEN FIREBASE
  ==================================================
  */

  const idToken =
    authorization
      .substring(
        7
      )
      .trim();


  if (
    !idToken
  ) {

    return errorResponse(
      "Token d'authentification invalide.",
      401
    );

  }


  /*
  ==================================================
  5. VÉRIFIER TOKEN FIREBASE CÔTÉ SERVEUR
  ==================================================
  */

  let decodedToken;


  try {

    decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

  } catch (
    authError
  ) {

    console.error(
      "[DEPOSIT] Token Firebase invalide :",
      authError
    );


    return errorResponse(
      "Session invalide ou expirée. Reconnectez-vous.",
      401
    );

  }


  /*
  ==================================================
  6. UID SERVEUR
  ==================================================

  IMPORTANT :

  Le UID ne vient jamais du frontend.

  Il vient du token Firebase vérifié.
  */

  const uid =
    decodedToken.uid;


  if (
    !uid
  ) {

    return errorResponse(
      "Utilisateur invalide.",
      401
    );

  }


  /*
  ==================================================
  7. LIRE BODY
  ==================================================
  */

  let body:
    unknown;


  try {

    body =
      await request.json();

  } catch {

    return errorResponse(
      "Requête JSON invalide.",
      400
    );

  }


  /*
  ==================================================
  8. EXTRAIRE BODY
  ==================================================
  */

  const bodyObject =
    body &&
    typeof body ===
      "object"
      ? body as Record<
          string,
          unknown
        >
      : null;


  /*
  ==================================================
  9. EXTRAIRE MONTANT
  ==================================================
  */

  const amount =
    Number(
      bodyObject?.amount
    );


  /*
  ==================================================
  10. VALIDATION MONTANT
  ==================================================
  */

  if (
    !Number.isFinite(
      amount
    )
  ) {

    return errorResponse(
      "Montant invalide.",
      400
    );

  }


  /*
  ==================================================
  11. ENTIER UNIQUEMENT
  ==================================================
  */

  if (
    !Number.isInteger(
      amount
    )
  ) {

    return errorResponse(
      "Le montant doit être un nombre entier en HTG.",
      400
    );

  }


  /*
  ==================================================
  12. MINIMUM 25 HTG
  ==================================================
  */

  if (
    amount <
    MIN_DEPOSIT_AMOUNT
  ) {

    return errorResponse(
      `Le dépôt minimum est de ${MIN_DEPOSIT_AMOUNT} HTG.`,
      400
    );

  }


  /*
  ==================================================
  13. MAXIMUM
  ==================================================
  */

  if (
    amount >
    MAX_DEPOSIT_AMOUNT
  ) {

    return errorResponse(
      `Le dépôt maximum est de ${MAX_DEPOSIT_AMOUNT.toLocaleString(
        "fr-FR"
      )} HTG.`,
      400
    );

  }


  /*
  ==================================================
  14. CALCUL OBLIGATION DE MISE
  ==================================================
  */

  const turnoverRequired =
    amount *
    DEPOSIT_TURNOVER_MULTIPLIER;


  /*
  ==================================================
  15. ID DÉPÔT
  ==================================================
  */

  const depositId =
    randomUUID();


  /*
  ==================================================
  16. REFERENCE UNIQUE
  ==================================================
  */

  const referenceId =
    `titato_deposit_${depositId}`;


  /*
  ==================================================
  17. CLÉ IDEMPOTENCE
  ==================================================
  */

  const idempotencyKey =
    `deposit_${uid}_${depositId}`;


  /*
  ==================================================
  18. TIMESTAMP
  ==================================================
  */

  const now =
    Date.now();


  /*
  ==================================================
  19. CRÉER DÉPÔT PENDING
  ==================================================

  IMPORTANT :

  Aucun crédit wallet ici.

  Le joueur n'est crédité qu'après confirmation
  du webhook MonCashConnect.

  */

  const deposit:
    DepositRecord = {

      uid,

      amount,

      currency:
        "HTG",

      status:
        "pending",

      provider:
        "moncashconnect",

      referenceId,

      idempotencyKey,

      paymentUrl:
        null,

      createdAt:
        now,

      updatedAt:
        now,

      turnoverMultiplier:
        DEPOSIT_TURNOVER_MULTIPLIER,

      turnoverRequired,

    };


  /*
  ==================================================
  20. RÉFÉRENCE FIREBASE
  ==================================================
  */

  const depositRef =
    adminDB.ref(
      `deposits/${depositId}`
    );


  /*
  ==================================================
  21. CRÉATION ATOMIQUE DU DÉPÔT
  ==================================================

  Le depositId est unique.

  Si Firebase détecte une donnée existante,
  la transaction n'écrase jamais le dépôt.
  */

  const depositTransaction =
    await depositRef.transaction(
      (
        currentData
      ) => {

        if (
          currentData !==
          null
        ) {

          return;

        }


        return deposit;

      }
    );


  /*
  ==================================================
  22. VÉRIFIER CRÉATION
  ==================================================
  */

  if (
    !depositTransaction.committed
  ) {

    console.error(
      "[DEPOSIT] Impossible de créer le dépôt.",
      {
        depositId,

        uid,
      }
    );


    return errorResponse(
      "Impossible de créer le dépôt.",
      500
    );

  }


  /*
  ==================================================
  23. CRÉER PAIEMENT MONCASHCONNECT
  ==================================================
  */

  let moncashResponse:
    Response;


  try {

    moncashResponse =
      await fetch(
        MONCASH_CREATE_URL,
        {

          method:
            "POST",

          headers: {

            "Authorization":
              `Bearer ${moncashApiKey}`,

            "Content-Type":
              "application/json",

            "Idempotency-Key":
              idempotencyKey,

          },

          body:
            JSON.stringify(
              {

                amount,

                referenceId,

                returnUrl:
                  `${appUrl}/wallet`,

              }
            ),

          signal:
            AbortSignal.timeout(
              15000
            ),

        }
      );

  } catch (
    moncashError
  ) {

    console.error(
      "[DEPOSIT] Erreur MonCashConnect :",
      moncashError
    );


    /*
    ================================================
    LE DÉPÔT RESTE EXISTANT MAIS EST FAILED
    ================================================
    */

    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          "MONCASH_REQUEST_FAILED",

      }
    );


    return errorResponse(
      "Impossible de démarrer le paiement MonCash.",
      502
    );

  }


  /*
  ==================================================
  24. PARSER RÉPONSE MONCASH
  ==================================================
  */

  let moncashData:
    MonCashCreateResponse;


  try {

    moncashData =
      await moncashResponse.json();

  } catch {

    console.error(
      "[DEPOSIT] Réponse MonCashConnect invalide."
    );


    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          "INVALID_MONCASH_RESPONSE",

      }
    );


    return errorResponse(
      "Réponse invalide du service de paiement.",
      502
    );

  }


  /*
  ==================================================
  25. VÉRIFIER RÉPONSE HTTP
  ==================================================
  */

  if (
    !moncashResponse.ok
  ) {

    console.error(
      "[DEPOSIT] MonCashConnect a refusé le paiement.",
      {

        status:
          moncashResponse.status,

        response:
          moncashData,

      }
    );


    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          moncashData.error ||
          "MONCASH_CREATE_FAILED",

      }
    );


    return errorResponse(
      moncashData.error ||
        moncashData.message ||
        "MonCashConnect n'a pas pu créer le paiement.",
      502
    );

  }


  /*
  ==================================================
  26. PAYMENT URL
  ==================================================
  */

  const paymentUrl =
    typeof moncashData.paymentUrl ===
    "string"
      ? moncashData.paymentUrl.trim()
      : "";


  if (
    !paymentUrl
  ) {

    console.error(
      "[DEPOSIT] paymentUrl absente."
    );


    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          "PAYMENT_URL_MISSING",

      }
    );


    return errorResponse(
      "URL de paiement MonCash introuvable.",
      502
    );

  }


  /*
  ==================================================
  27. VALIDER URL
  ==================================================
  */

  let paymentUrlObject:
    URL;


  try {

    paymentUrlObject =
      new URL(
        paymentUrl
      );

  } catch {

    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          "INVALID_PAYMENT_URL",

      }
    );


    return errorResponse(
      "URL de paiement invalide.",
      502
    );

  }


  /*
  ==================================================
  28. HTTPS OBLIGATOIRE
  ==================================================
  */

  if (
    paymentUrlObject.protocol !==
    "https:"
  ) {

    await depositRef.update(
      {

        status:
          "failed",

        updatedAt:
          Date.now(),

        failedAt:
          Date.now(),

        errorCode:
          "PAYMENT_URL_NOT_HTTPS",

      }
    );


    return errorResponse(
      "URL de paiement non sécurisée.",
      502
    );

  }


  /*
  ==================================================
  29. METTRE PAYMENT URL
  ==================================================
  */

  await depositRef.update(
    {

      paymentUrl,

      updatedAt:
        Date.now(),

      moncashTransactionId:
        moncashData.transactionId ||
        moncashData.id ||
        null,

    }
  );


  /*
  ==================================================
  30. LOG
  ==================================================
  */

  console.log(
    "[DEPOSIT] Paiement créé.",
    {

      depositId,

      uid,

      amount,

      turnoverRequired,

      referenceId,

    }
  );


  /*
  ==================================================
  31. RÉPONSE
  ==================================================
  */

  return NextResponse.json(
    {

      success:
        true,

      depositId,

      referenceId,

      paymentUrl,

      amount,

      turnoverRequired,

    },
    {
      status:
        200,
    }
  );

}