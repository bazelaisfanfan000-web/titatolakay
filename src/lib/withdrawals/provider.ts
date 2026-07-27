/*
====================================================
TiTaTo - MonCashConnect Withdrawal Provider
====================================================

Ce fichier communique avec MonCashConnect pour
effectuer les retraits.

API :

POST /v1/payout-create

Authorization :

Bearer sk_proj_xxxxxxxxx

Body :

{
  "amount": 1000,
  "moncashNumber": "509xxxxxxxx",
  "referenceId": "withdrawal_xxxxx"
}

====================================================

RÈGLE DE SÉCURITÉ CRITIQUE
====================================================

Un timeout ou une erreur réseau NE signifie PAS
forcément que MonCashConnect n'a pas créé le payout.

Exemple :

1. TiTaTo envoie le payout.
2. MonCashConnect crée le payout.
3. La réponse est envoyée.
4. La connexion coupe avant que TiTaTo reçoive
   la réponse.

Dans ce cas, le payout peut exister chez
MonCashConnect.

Donc :

ERREUR RÉSEAU / TIMEOUT
        ↓
NE PAS REMBOURSER AUTOMATIQUEMENT
        ↓
STATUT PROVIDER UNKNOWN
        ↓
RÉCUPÉRATION PAR referenceId / payoutId
        ↓
WEBHOOK OU VÉRIFICATION PROVIDER

====================================================

IMPORTANT :

- Serveur uniquement.
- Ne jamais importer dans un composant client.
- Ne jamais exposer MONCASHCONNECT_SECRET_KEY.
- Utiliser une référence unique pour chaque retrait.
- Le webhook reste la source finale de confirmation.

====================================================
*/


import type {
  MonCashPayoutCreateResponse,
} from "./types";


/*
====================================================
CONFIGURATION
====================================================
*/


const MONCASHCONNECT_API_URL =
  process.env.MONCASHCONNECT_API_URL ??
  "https://api.moncashconnect.com";


const PAYOUT_CREATE_ENDPOINT =
  "/v1/payout-create";


/*
Timeout de la requête HTTP.

IMPORTANT :

Un timeout est traité comme une situation
inconnue et non comme un échec définitif.
*/


const REQUEST_TIMEOUT_MS =
  30_000;


/*
====================================================
TYPES
====================================================
*/


export interface CreateMonCashPayoutInput {

  /*
  Montant exact envoyé au joueur.
  */

  amount: number;


  /*
  Numéro MonCash normalisé.

  Format :

  509XXXXXXXX
  */

  moncashNumber: string;


  /*
  Référence unique TiTaTo.

  Exemple :

  withdrawal_abc123
  */

  referenceId: string;
}


/*
====================================================
RÉSULTAT DU PAYOUT
====================================================

Les résultats sont séparés en plusieurs catégories :

accepted
    Le provider a accepté le payout.

failed
    Le provider a explicitement refusé le payout.

unknown
    On ne sait pas si le provider a créé
    le payout.

====================================================
*/


export type MonCashPayoutResultStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "unknown";


export interface CreateMonCashPayoutResult {

  /*
  Indique si la requête métier est considérée
  comme acceptée.

  true :
  queued
  processing
  completed

  false :
  failed
  unknown
  */

  success: boolean;


  /*
  Indique si le résultat est incertain.

  true uniquement pour :

  timeout
  erreur réseau
  réponse impossible à déterminer

  IMPORTANT :

  unknown = NE PAS REMBOURSER AUTOMATIQUEMENT.
  */

  uncertain: boolean;


  /*
  Statut provider.
  */

  status?:
    MonCashPayoutResultStatus;


  /*
  ID du payout MonCashConnect.
  */

  payoutId?: string;


  /*
  Référence TiTaTo.
  */

  referenceId?: string;


  /*
  Montant.
  */

  amount?: number;


  /*
  Frais MonCashConnect.
  */

  feeHtg?: number;


  /*
  Message d'erreur.
  */

  error?: string;


  /*
  Code HTTP.
  */

  httpStatus?: number;


  /*
  Réponse brute.

  Ne jamais envoyer directement au client.
  */

  rawResponse?: unknown;
}


/*
====================================================
RÉPONSE NORMALISÉE
====================================================
*/


interface NormalizedPayoutResponse {

  status:
    | "queued"
    | "processing"
    | "completed"
    | "failed";


  payoutId?: string;


  referenceId?: string;


  amount?: number;


  feeHtg?: number;


  message?: string;


  code?: string;
}


/*
====================================================
RÉCUPÉRER LA CLÉ SECRÈTE
====================================================
*/


function getMonCashSecretKey(): string {

  const secretKey =
    process.env.MONCASHCONNECT_SECRET_KEY;


  /*
  La clé est obligatoire.
  */

  if (
    !secretKey ||
    secretKey.trim().length === 0
  ) {

    throw new Error(
      "MONCASHCONNECT_SECRET_KEY n'est pas configurée.",
    );
  }


  /*
  Vérification basique du format.
  */

  if (
    !secretKey.startsWith(
      "sk_proj_",
    )
  ) {

    throw new Error(
      "MONCASHCONNECT_SECRET_KEY est invalide.",
    );
  }


  return secretKey;
}


/*
====================================================
VALIDATION DU MONTANT
====================================================
*/


function isValidAmount(
  amount: number,
): boolean {

  return (
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    Number.isInteger(amount) &&
    amount > 0
  );
}


/*
====================================================
VALIDATION NUMÉRO MONCASH
====================================================
*/


function isValidMonCashNumber(
  moncashNumber: string,
): boolean {

  return (
    typeof moncashNumber === "string" &&
    /^509\d{8}$/.test(
      moncashNumber,
    )
  );
}


/*
====================================================
VALIDATION REFERENCE ID
====================================================
*/


function isValidReferenceId(
  referenceId: string,
): boolean {

  return (
    typeof referenceId === "string" &&
    referenceId.trim().length > 0 &&
    referenceId.length <= 200
  );
}


/*
====================================================
LECTURE SÉCURISÉE DE LA RÉPONSE
====================================================
*/


async function parseResponseBody(
  response: Response,
): Promise<unknown> {

  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";


  /*
  Réponse JSON.
  */

  if (
    contentType
      .toLowerCase()
      .includes(
        "application/json",
      )
  ) {

    try {

      return await response.json();

    } catch {

      return null;
    }
  }


  /*
  Essaie le texte.
  */

  try {

    return await response.text();

  } catch {

    return null;
  }
}


/*
====================================================
NORMALISER LA RÉPONSE MONCASHCONNECT
====================================================
*/


function normalizePayoutResponse(
  data: unknown,
): NormalizedPayoutResponse {

  /*
  Réponse invalide.
  */

  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data)
  ) {

    return {

      status:
        "failed",

      message:
        "Réponse invalide de MonCashConnect.",
    };
  }


  const body =
    data as Record<
      string,
      unknown
    >;


  /*
  --------------------------------------------------
  STATUT
  --------------------------------------------------
  */

  const rawStatus =
    body.status;


  let status:
    | "queued"
    | "processing"
    | "completed"
    | "failed";


  if (
    rawStatus === "queued" ||
    rawStatus === "processing" ||
    rawStatus === "completed" ||
    rawStatus === "failed"
  ) {

    status =
      rawStatus;

  } else {

    /*
    Un statut inconnu ne doit jamais
    être considéré comme un succès.

    On le traite comme un échec explicite
    de compréhension de la réponse.

    La requête HTTP étant terminée,
    ce n'est pas un timeout réseau.
    */

    status =
      "failed";
  }


  /*
  --------------------------------------------------
  PAYOUT ID
  --------------------------------------------------

  Supporte :

  payoutId

  ou

  id
  */

  const payoutId =
    typeof body.payoutId === "string"
      ? body.payoutId
      : typeof body.id === "string"
        ? body.id
        : undefined;


  /*
  --------------------------------------------------
  REFERENCE ID
  --------------------------------------------------
  */

  const referenceId =
    typeof body.referenceId === "string"
      ? body.referenceId
      : undefined;


  /*
  --------------------------------------------------
  MONTANT
  --------------------------------------------------
  */

  const amount =
    typeof body.amount === "number"
      ? body.amount
      : undefined;


  /*
  --------------------------------------------------
  FRAIS
  --------------------------------------------------
  */

  const feeHtg =
    typeof body.fee_htg === "number"
      ? body.fee_htg
      : undefined;


  /*
  --------------------------------------------------
  MESSAGE
  --------------------------------------------------
  */

  const message =
    typeof body.message === "string"
      ? body.message
      : undefined;


  /*
  --------------------------------------------------
  CODE
  --------------------------------------------------
  */

  const code =
    typeof body.code === "string"
      ? body.code
      : undefined;


  return {

    status,

    payoutId,

    referenceId,

    amount,

    feeHtg,

    message,

    code,
  };
}


/*
====================================================
EXTRAIRE LE MESSAGE D'ERREUR
====================================================
*/


function extractErrorMessage(
  data: unknown,
  fallback: string,
): string {

  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data)
  ) {

    return fallback;
  }


  const body =
    data as Record<
      string,
      unknown
    >;


  if (
    typeof body.message ===
    "string"
  ) {

    return body.message;
  }


  if (
    typeof body.error ===
    "string"
  ) {

    return body.error;
  }


  return fallback;
}


/*
====================================================
CRÉER UN PAYOUT
====================================================
*/


export async function createMonCashPayout(
  input: CreateMonCashPayoutInput,
): Promise<CreateMonCashPayoutResult> {

  /*
  --------------------------------------------------
  VALIDATION DU MONTANT
  --------------------------------------------------
  */

  if (
    !isValidAmount(
      input.amount,
    )
  ) {

    return {

      success:
        false,

      uncertain:
        false,

      status:
        "failed",

      error:
        "Montant de payout invalide.",
    };
  }


  /*
  --------------------------------------------------
  VALIDATION DU NUMÉRO
  --------------------------------------------------
  */

  if (
    !isValidMonCashNumber(
      input.moncashNumber,
    )
  ) {

    return {

      success:
        false,

      uncertain:
        false,

      status:
        "failed",

      error:
        "Numéro MonCash invalide.",
    };
  }


  /*
  --------------------------------------------------
  VALIDATION REFERENCE ID
  --------------------------------------------------
  */

  if (
    !isValidReferenceId(
      input.referenceId,
    )
  ) {

    return {

      success:
        false,

      uncertain:
        false,

      status:
        "failed",

      error:
        "ReferenceId invalide.",
    };
  }


  /*
  --------------------------------------------------
  RÉCUPÉRER LA CLÉ
  --------------------------------------------------
  */

  let secretKey: string;


  try {

    secretKey =
      getMonCashSecretKey();

  } catch (
    error
  ) {

    return {

      success:
        false,

      uncertain:
        false,

      status:
        "failed",

      error:
        error instanceof Error
          ? error.message
          : "Clé MonCashConnect indisponible.",
    };
  }


  /*
  --------------------------------------------------
  CONSTRUIRE L'URL
  --------------------------------------------------
  */

  const url =
    `${MONCASHCONNECT_API_URL}${PAYOUT_CREATE_ENDPOINT}`;


  /*
  --------------------------------------------------
  ABORT CONTROLLER
  --------------------------------------------------
  */

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => {

        controller.abort();

      },
      REQUEST_TIMEOUT_MS,
    );


  /*
  --------------------------------------------------
  APPEL MONCASHCONNECT
  --------------------------------------------------
  */

  try {

    const response =
      await fetch(
        url,
        {

          method:
            "POST",


          headers: {

            Authorization:
              `Bearer ${secretKey}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },


          body:
            JSON.stringify({

              amount:
                input.amount,

              moncashNumber:
                input.moncashNumber,

              referenceId:
                input.referenceId,

            }),


          signal:
            controller.signal,
        },
      );


    /*
    ------------------------------------------------
    LIRE LA RÉPONSE
    ------------------------------------------------
    */

    const rawData =
      await parseResponseBody(
        response,
      );


    /*
    ------------------------------------------------
    ERREUR HTTP
    ------------------------------------------------

    IMPORTANT :

    Une réponse HTTP reçue signifie que
    MonCashConnect a répondu.

    On peut donc distinguer une erreur
    définitive d'un timeout réseau.

    ------------------------------------------------
    */

    if (
      !response.ok
    ) {

      const errorMessage =
        extractErrorMessage(

          rawData,

          "MonCashConnect a refusé la demande de retrait.",

        );


      /*
      Les erreurs HTTP 400 / 401 / 403
      sont considérées comme refus explicite.

      Le service supérieur pourra déclencher
      le remboursement.

      */

      return {

        success:
          false,

        uncertain:
          false,

        status:
          "failed",

        error:
          errorMessage,

        httpStatus:
          response.status,

        referenceId:
          input.referenceId,

        rawResponse:
          rawData,
      };
    }


    /*
    ------------------------------------------------
    NORMALISER LA RÉPONSE
    ------------------------------------------------
    */

    const payout =
      normalizePayoutResponse(
        rawData,
      );


    /*
    ------------------------------------------------
    VÉRIFICATION DU STATUT
    ------------------------------------------------
    */

    if (
      payout.status ===
      "failed"
    ) {

      return {

        success:
          false,

        uncertain:
          false,

        status:
          "failed",

        payoutId:
          payout.payoutId,

        referenceId:
          payout.referenceId ??
          input.referenceId,

        amount:
          payout.amount ??
          input.amount,

        feeHtg:
          payout.feeHtg,

        error:
          payout.message ??
          "MonCashConnect a signalé un échec du payout.",

        httpStatus:
          response.status,

        rawResponse:
          rawData,
      };
    }


    /*
    ------------------------------------------------
    PAYOUT ACCEPTÉ
    ------------------------------------------------

    queued
    processing
    completed

    Le montant reste réservé.

    Le webhook confirmera le résultat final.

    ------------------------------------------------
    */

    return {

      success:
        true,

      uncertain:
        false,

      status:
        payout.status,

      payoutId:
        payout.payoutId,

      referenceId:
        payout.referenceId ??
        input.referenceId,

      amount:
        payout.amount ??
        input.amount,

      feeHtg:
        payout.feeHtg,

      httpStatus:
        response.status,

      rawResponse:
        rawData,
    };


  } catch (
    error
  ) {

    /*
    ------------------------------------------------
    TIMEOUT
    ------------------------------------------------

    CRITIQUE :

    NE PAS considérer cela comme un échec
    définitif.

    Le payout pourrait avoir été créé
    côté MonCashConnect.

    ------------------------------------------------
    */

    if (
      error instanceof Error &&
      error.name ===
      "AbortError"
    ) {

      return {

        success:
          false,

        uncertain:
          true,

        status:
          "unknown",

        referenceId:
          input.referenceId,

        error:
          "La requête MonCashConnect a expiré. Le statut du payout doit être vérifié avant tout remboursement.",

        rawResponse:
          null,
      };
    }


    /*
    ------------------------------------------------
    ERREUR RÉSEAU
    ------------------------------------------------

    Exemple :

    DNS
    connexion coupée
    socket
    TLS
    réseau indisponible

    Même principe :

    NE PAS REMBOURSER AUTOMATIQUEMENT.

    ------------------------------------------------
    */

    return {

      success:
        false,

      uncertain:
        true,

      status:
        "unknown",

      referenceId:
        input.referenceId,

      error:
        error instanceof Error
          ? `Impossible de confirmer le statut du payout : ${error.message}`
          : "Impossible de confirmer le statut du payout MonCashConnect.",

      rawResponse:
        null,
    };


  } finally {

    clearTimeout(
      timeout,
    );
  }
}


/*
====================================================
VÉRIFIER SI LE PAYOUT A ÉTÉ ACCEPTÉ
====================================================
*/


export function isPayoutAccepted(
  result: CreateMonCashPayoutResult,
): boolean {

  return (

    result.success ===
    true &&

    (
      result.status ===
        "queued" ||

      result.status ===
        "processing" ||

      result.status ===
        "completed"
    )

  );
}


/*
====================================================
VÉRIFIER SI LE PAYOUT EST TERMINÉ
====================================================
*/


export function isPayoutCompleted(
  result: CreateMonCashPayoutResult,
): boolean {

  return (

    result.success ===
    true &&

    result.status ===
    "completed"

  );
}


/*
====================================================
VÉRIFIER SI LE PAYOUT EST UN ÉCHEC DÉFINITIF
====================================================

IMPORTANT :

Cette fonction retourne true uniquement
pour un échec certain.

Elle NE retourne PAS true pour :

- timeout
- erreur réseau
- statut unknown

====================================================
*/


export function isPayoutFailed(
  result: CreateMonCashPayoutResult,
): boolean {

  return (

    result.success ===
    false &&

    result.uncertain ===
    false &&

    result.status ===
    "failed"

  );
}


/*
====================================================
VÉRIFIER SI LE STATUT EST INCONNU
====================================================
*/


export function isPayoutStatusUnknown(
  result: CreateMonCashPayoutResult,
): boolean {

  return (

    result.success ===
    false &&

    result.uncertain ===
    true &&

    result.status ===
    "unknown"

  );
}


/*
====================================================
VÉRIFIER SI UN REMBOURSEMENT EST AUTORISÉ
====================================================

RÈGLE CRITIQUE :

On ne rembourse que si MonCashConnect
a explicitement refusé le payout.

JAMAIS de remboursement automatique
sur un timeout ou une erreur réseau.

====================================================
*/


export function isPayoutSafeToRefund(
  result: CreateMonCashPayoutResult,
): boolean {

  return (
    isPayoutFailed(
      result,
    )
  );
}