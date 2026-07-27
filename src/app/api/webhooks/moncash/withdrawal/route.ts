/*
====================================================
TiTaTo - MonCashConnect Withdrawal Webhook
====================================================

Endpoint :

POST /api/withdrawals/webhook

ÉVÉNEMENTS :

payout.completed
payout.failed

RESPONSABILITÉS :

1. Recevoir le webhook.
2. Lire le body RAW.
3. Vérifier la signature HMAC-SHA256.
4. Vérifier le timestamp.
5. Vérifier l'événement.
6. Trouver le retrait.
7. Empêcher le double traitement.
8. Compléter le retrait OU lancer le remboursement.
9. Libérer le verrou utilisateur.

IMPORTANT :

Le webhook est une notification serveur-à-serveur.

Le frontend ne doit jamais appeler cette route
pour confirmer un retrait.

====================================================
*/


import {
  NextRequest,
  NextResponse,
} from "next/server";


import {
  createHmac,
  timingSafeEqual,
} from "crypto";


import {
  getDatabase,
} from "firebase-admin/database";


import {
  completeWithdrawal,
  markWithdrawalFailed,
  refundFailedWithdrawal,
} from "@/lib/withdrawals/atomic";


/*
====================================================
TYPES
====================================================
*/


type WebhookEventType =
  | "payout.completed"
  | "payout.failed"
  | "payout.processing"
  | "payout.queued";


interface WithdrawalWebhookPayload {

  event:
    WebhookEventType;

  referenceId?: string;

  payoutId?: string;

  status?:
    | "queued"
    | "processing"
    | "completed"
    | "failed";

  amount?: number;

  fee_htg?: number;

  feeHtg?: number;

  moncashNumber?: string;

  error?: string;

  errorMessage?: string;

  timestamp?: string | number;

  data?: {

    referenceId?: string;

    payoutId?: string;

    status?:
      | "queued"
      | "processing"
      | "completed"
      | "failed";

    amount?: number;

    fee_htg?: number;

    feeHtg?: number;

    error?: string;

    errorMessage?: string;
  };
}


/*
====================================================
CONFIGURATION
====================================================
*/


const WEBHOOK_SECRET =
  process.env.MONCASHCONNECT_WEBHOOK_SECRET;


/*
Durée maximale d'acceptation
d'un webhook.

Exemple :

5 minutes.

Un webhook beaucoup trop ancien
est rejeté pour réduire les risques
de replay attack.
*/

const WEBHOOK_TIMESTAMP_TOLERANCE_MS =
  5 * 60 * 1000;


/*
====================================================
RÉCUPÉRER UN HEADER
====================================================
*/


function getFirstHeader(
  request: NextRequest,
  names: string[],
): string | null {

  for (
    const name of names
  ) {

    const value =
      request.headers.get(
        name,
      );


    if (
      value &&
      value.trim().length > 0
    ) {

      return value.trim();
    }
  }


  return null;
}


/*
====================================================
RÉCUPÉRER LA SIGNATURE
====================================================
*/


function getWebhookSignature(
  request: NextRequest,
): string | null {

  /*
  On accepte plusieurs noms possibles.

  À adapter au nom exact utilisé
  par MonCashConnect.
  */

  return getFirstHeader(

    request,

    [
      "x-moncashconnect-signature",

      "x-webhook-signature",

      "x-signature",

      "webhook-signature",

    ],

  );
}


/*
====================================================
RÉCUPÉRER LE TIMESTAMP
====================================================
*/


function getWebhookTimestamp(
  request: NextRequest,
  payload: WithdrawalWebhookPayload,
): string | null {

  /*
  Priorité au header.

  Le timestamp utilisé pour la signature
  doit normalement venir du header signé.
  */

  const headerTimestamp =
    getFirstHeader(

      request,

      [
        "x-moncashconnect-timestamp",

        "x-webhook-timestamp",

        "x-timestamp",

      ],

    );


  if (
    headerTimestamp
  ) {

    return headerTimestamp;
  }


  /*
  Fallback :

  timestamp présent dans le payload.

  À utiliser seulement si le protocole
  MonCashConnect le prévoit réellement.
  */

  if (
    payload.timestamp !==
    undefined
  ) {

    return String(
      payload.timestamp,
    );
  }


  return null;
}


/*
====================================================
CONVERTIR TIMESTAMP
====================================================
*/


function parseTimestamp(
  timestamp: string,
): number | null {

  /*
  Cas 1 :

  timestamp Unix en secondes.

  Exemple :

  1750000000
  */

  if (
    /^\d{10}$/.test(
      timestamp,
    )
  ) {

    const seconds =
      Number(
        timestamp,
      );


    if (
      Number.isFinite(
        seconds,
      )
    ) {

      return (
        seconds *
        1000
      );
    }
  }


  /*
  Cas 2 :

  timestamp Unix en millisecondes.

  Exemple :

  1750000000000
  */

  if (
    /^\d{13}$/.test(
      timestamp,
    )
  ) {

    const milliseconds =
      Number(
        timestamp,
      );


    if (
      Number.isFinite(
        milliseconds,
      )
    ) {

      return milliseconds;
    }
  }


  /*
  Cas 3 :

  ISO 8601.

  Exemple :

  2026-07-26T20:00:00.000Z
  */

  const parsed =
    Date.parse(
      timestamp,
    );


  if (
    Number.isFinite(
      parsed,
    )
  ) {

    return parsed;
  }


  return null;
}


/*
====================================================
VÉRIFIER LE TIMESTAMP
====================================================
*/


function isTimestampValid(
  timestamp: string,
): boolean {

  const parsed =
    parseTimestamp(
      timestamp,
    );


  if (
    parsed ===
    null
  ) {

    return false;
  }


  const difference =
    Math.abs(

      Date.now() -
      parsed,

    );


  return (
    difference <=
    WEBHOOK_TIMESTAMP_TOLERANCE_MS
  );
}


/*
====================================================
NORMALISER UNE SIGNATURE
====================================================
*/


function normalizeSignature(
  signature: string,
): string {

  /*
  Certaines implémentations utilisent :

  sha256=abcdef...

  tandis que d'autres utilisent :

  abcdef...

  */

  if (
    signature.startsWith(
      "sha256=",
    )
  ) {

    return signature.slice(
      7,
    );
  }


  return signature;
}


/*
====================================================
VÉRIFIER HMAC-SHA256
====================================================

ATTENTION :

Le format exact de la chaîne signée
doit correspondre à la documentation
MonCashConnect.

Ici :

timestamp + "." + rawBody

Exemple :

1750000000.{"event":"payout.completed"}

====================================================
*/


function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {

  if (
    !WEBHOOK_SECRET
  ) {

    console.error(
      "[WEBHOOK_CONFIG_ERROR] MONCASHCONNECT_WEBHOOK_SECRET est absent.",
    );


    return false;
  }


  /*
  Données signées.

  IMPORTANT :

  Utiliser exactement le body RAW.
  */

  const signedPayload =
    `${timestamp}.${rawBody}`;


  const expectedSignature =
    createHmac(
      "sha256",
      WEBHOOK_SECRET,
    )
      .update(
        signedPayload,
        "utf8",
      )
      .digest(
        "hex",
      );


  const receivedSignature =
    normalizeSignature(
      signature,
    );


  /*
  Vérification de longueur avant
  timingSafeEqual.

  timingSafeEqual exige des buffers
  de même longueur.
  */

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8",
    );


  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "utf8",
    );


  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {

    return false;
  }


  return timingSafeEqual(

    expectedBuffer,

    receivedBuffer,

  );
}


/*
====================================================
RÉCUPÉRER REFERENCE ID
====================================================
*/


function getReferenceId(
  payload: WithdrawalWebhookPayload,
): string | null {

  if (
    typeof payload.referenceId ===
    "string" &&
    payload.referenceId.trim().length >
    0
  ) {

    return payload.referenceId.trim();
  }


  if (
    payload.data &&
    typeof payload.data.referenceId ===
    "string" &&
    payload.data.referenceId.trim().length >
    0
  ) {

    return payload.data.referenceId.trim();
  }


  return null;
}


/*
====================================================
RÉCUPÉRER PAYOUT ID
====================================================
*/


function getPayoutId(
  payload: WithdrawalWebhookPayload,
): string | undefined {

  if (
    typeof payload.payoutId ===
    "string" &&
    payload.payoutId.trim().length >
    0
  ) {

    return payload.payoutId.trim();
  }


  if (
    payload.data &&
    typeof payload.data.payoutId ===
    "string" &&
    payload.data.payoutId.trim().length >
    0
  ) {

    return payload.data.payoutId.trim();
  }


  return undefined;
}


/*
====================================================
RÉCUPÉRER FEE HTG
====================================================
*/


function getFeeHtg(
  payload: WithdrawalWebhookPayload,
): number | undefined {

  const fee =
    payload.fee_htg ??
    payload.feeHtg ??
    payload.data?.fee_htg ??
    payload.data?.feeHtg;


  if (
    typeof fee !==
      "number" ||
    !Number.isFinite(
      fee,
    ) ||
    fee < 0
  ) {

    return undefined;
  }


  return fee;
}


/*
====================================================
RÉCUPÉRER MESSAGE D'ERREUR
====================================================
*/


function getErrorMessage(
  payload: WithdrawalWebhookPayload,
): string {

  if (
    typeof payload.error ===
    "string" &&
    payload.error.trim().length >
    0
  ) {

    return payload.error.trim();
  }


  if (
    typeof payload.errorMessage ===
    "string" &&
    payload.errorMessage.trim().length >
    0
  ) {

    return payload.errorMessage.trim();
  }


  if (
    typeof payload.data?.error ===
    "string" &&
    payload.data.error.trim().length >
    0
  ) {

    return payload.data.error.trim();
  }


  if (
    typeof payload.data?.errorMessage ===
    "string" &&
    payload.data.errorMessage.trim().length >
    0
  ) {

    return payload.data.errorMessage.trim();
  }


  return "MonCashConnect a signalé l'échec du retrait.";
}


/*
====================================================
RECHERCHER LE RETRAIT
====================================================
*/


async function findWithdrawalByReferenceId(
  referenceId: string,
): Promise<WithdrawalRecord | null> {

  const db =
    getDatabase();


  const snapshot =
    await db
      .ref(
        "withdrawals",
      )
      .orderByChild(
        "referenceId",
      )
      .equalTo(
        referenceId,
      )
      .get();


  if (
    !snapshot.exists()
  ) {

    return null;
  }


  const data =
    snapshot.val() as Record<
      string,
      WithdrawalRecord
    >;


  const entries =
    Object.entries(
      data,
    );


  if (
    entries.length ===
    0
  ) {

    return null;
  }


  /*
  Retourne le premier retrait correspondant.

  referenceId doit être unique.
  */

  return entries[0][1];
}


/*
====================================================
TYPE RETRAIT
====================================================
*/


interface WithdrawalRecord {

  id: string;

  uid: string;

  amount: number;

  feeHtg?: number;

  totalCostHtg?: number;

  moncashNumber: string;

  referenceId: string;

  payoutId?: string;

  status:
    | "pending"
    | "processing"
    | "completed"
    | "refund_pending"
    | "refunded"
    | "failed";

  providerStatus?:
    | "queued"
    | "processing"
    | "completed"
    | "failed";

  fundsReserved?: boolean;

  fundsRefunded?: boolean;

  webhookProcessed?: boolean;

  createdAt: number;

  updatedAt: number;

  completedAt?: number;

  failedAt?: number;

  refundedAt?: number;

  errorMessage?: string;
}


/*
====================================================
VÉRIFIER LA COHÉRENCE DU PAYOUT
====================================================

On vérifie que le webhook correspond
au retrait enregistré.

====================================================
*/


function validateWebhookAgainstWithdrawal(
  payload: WithdrawalWebhookPayload,
  withdrawal: WithdrawalRecord,
): boolean {

  /*
  Vérification du montant si fourni.

  Le provider ne doit pas confirmer
  un montant différent de celui demandé.
  */

  const webhookAmount =
    payload.amount ??
    payload.data?.amount;


  if (
    typeof webhookAmount ===
    "number"
  ) {

    if (
      webhookAmount !==
      withdrawal.amount
    ) {

      console.error(
        "[WEBHOOK_AMOUNT_MISMATCH]",
        {
          withdrawalId:
            withdrawal.id,

          expected:
            withdrawal.amount,

          received:
            webhookAmount,
        },
      );


      return false;
    }
  }


  /*
  Vérification du payoutId.

  Si le retrait possède déjà un payoutId,
  le webhook doit correspondre.

  */

  const payoutId =
    getPayoutId(
      payload,
    );


  if (
    withdrawal.payoutId &&
    payoutId &&
    withdrawal.payoutId !==
    payoutId
  ) {

    console.error(
      "[WEBHOOK_PAYOUT_ID_MISMATCH]",
      {
        withdrawalId:
          withdrawal.id,

        expected:
          withdrawal.payoutId,

        received:
          payoutId,
      },
    );


    return false;
  }


  return true;
}


/*
====================================================
MARQUER WEBHOOK TRAITÉ
====================================================

Cette fonction utilise une transaction.

Elle empêche deux webhooks identiques
de lancer deux remboursements.

====================================================
*/


async function markWebhookAsProcessed(
  withdrawalId: string,
): Promise<
  | "processed"
  | "already_processed"
  | "not_found"
  | "invalid"
> {

  const db =
    getDatabase();


  const withdrawalRef =
    db.ref(
      `withdrawals/${withdrawalId}`,
    );


  const result =
    await withdrawalRef.transaction(
      (
        withdrawal,
      ) => {

        if (
          withdrawal ===
          null
        ) {

          return;
        }


        /*
        Déjà traité.

        On ne modifie rien.
        */

        if (
          withdrawal.webhookProcessed ===
          true
        ) {

          return;
        }


        /*
        Marquer le webhook
        comme en cours de traitement.

        */

        return {

          ...withdrawal,

          webhookProcessed:
            true,

          webhookProcessedAt:
            Date.now(),

          updatedAt:
            Date.now(),
        };
      },
    );


  if (
    !result.committed
  ) {

    const latest =
      result.snapshot.val() as
        | WithdrawalRecord
        | null;


    if (
      latest?.webhookProcessed ===
      true
    ) {

      return "already_processed";
    }


    return "not_found";
  }


  return "processed";
}


/*
====================================================
ROLLBACK WEBHOOK PROCESSING
====================================================

Si une erreur serveur survient après
avoir marqué webhookProcessed=true,
on remet le flag à false.

Cela permet au provider de renvoyer
le webhook.

====================================================
*/


async function rollbackWebhookProcessed(
  withdrawalId: string,
): Promise<void> {

  const db =
    getDatabase();


  await db
    .ref(
      `withdrawals/${withdrawalId}`,
    )
    .update({

      webhookProcessed:
        false,

      updatedAt:
        Date.now(),
    });
}


/*
====================================================
POST WEBHOOK
====================================================
*/


export async function POST(
  request: NextRequest,
) {

  /*
  --------------------------------------------------
  ÉTAPE 1
  VÉRIFIER LA CONFIGURATION
  --------------------------------------------------
  */

  if (
    !WEBHOOK_SECRET
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_CONFIG_ERROR] Secret webhook absent.",
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Webhook non configuré.",
      },

      {
        status:
          500,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 2
  LIRE LE BODY RAW
  --------------------------------------------------

  IMPORTANT :

  Ne pas utiliser request.json()
  avant la vérification HMAC.

  --------------------------------------------------
  */

  const rawBody =
    await request.text();


  if (
    !rawBody ||
    rawBody.trim().length ===
    0
  ) {

    return NextResponse.json(

      {
        success:
          false,

        error:
          "Body webhook vide.",
      },

      {
        status:
          400,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 3
  PARSER LE JSON
  --------------------------------------------------
  */

  let payload:
    WithdrawalWebhookPayload;


  try {

    payload =
      JSON.parse(
        rawBody,
      );

  } catch (
    error
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_JSON_ERROR]",
      error,
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Payload JSON invalide.",
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
  RÉCUPÉRER SIGNATURE
  --------------------------------------------------
  */

  const signature =
    getWebhookSignature(
      request,
    );


  if (
    !signature
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_SIGNATURE_MISSING]",
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Signature webhook manquante.",
      },

      {
        status:
          401,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 5
  RÉCUPÉRER TIMESTAMP
  --------------------------------------------------
  */

  const timestamp =
    getWebhookTimestamp(

      request,

      payload,

    );


  if (
    !timestamp
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_TIMESTAMP_MISSING]",
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Timestamp webhook manquant.",
      },

      {
        status:
          401,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 6
  VÉRIFIER TIMESTAMP
  --------------------------------------------------
  */

  if (
    !isTimestampValid(
      timestamp,
    )
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_TIMESTAMP_INVALID]",
      {
        timestamp,
      },
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Webhook expiré ou timestamp invalide.",
      },

      {
        status:
          401,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 7
  VÉRIFIER HMAC
  --------------------------------------------------
  */

  const signatureValid =
    verifyWebhookSignature(

      rawBody,

      signature,

      timestamp,

    );


  if (
    !signatureValid
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_SIGNATURE_INVALID]",
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Signature webhook invalide.",
      },

      {
        status:
          401,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 8
  RÉCUPÉRER EVENT
  --------------------------------------------------
  */

  const event =
    payload.event;


  if (
    !event
  ) {

    return NextResponse.json(

      {
        success:
          false,

        error:
          "Événement webhook manquant.",
      },

      {
        status:
          400,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 9
  RÉCUPÉRER REFERENCE ID
  --------------------------------------------------
  */

  const referenceId =
    getReferenceId(
      payload,
    );


  if (
    !referenceId
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_REFERENCE_MISSING]",
      {
        event,
      },
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "referenceId manquant.",
      },

      {
        status:
          400,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 10
  RECHERCHER LE RETRAIT
  --------------------------------------------------
  */

  let withdrawal:
    WithdrawalRecord | null;


  try {

    withdrawal =
      await findWithdrawalByReferenceId(

        referenceId,

      );

  } catch (
    error
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_LOOKUP_ERROR]",
      error,
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Erreur lors de la recherche du retrait.",
      },

      {
        status:
          500,
      },

    );
  }


  /*
  Retrait inconnu.

  On retourne 404 afin que le problème
  puisse être détecté.

  */

  if (
    !withdrawal
  ) {

    console.error(
      "[WITHDRAWAL_WEBHOOK_WITHDRAWAL_NOT_FOUND]",
      {
        referenceId,
        event,
      },
    );


    return NextResponse.json(

      {
        success:
          false,

        error:
          "Retrait introuvable.",
      },

      {
        status:
          404,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 11
  VÉRIFIER COHÉRENCE
  --------------------------------------------------
  */

  if (
    !validateWebhookAgainstWithdrawal(

      payload,

      withdrawal,

    )
  ) {

    return NextResponse.json(

      {
        success:
          false,

        error:
          "Les informations du webhook ne correspondent pas au retrait.",
      },

      {
        status:
          400,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 12
  ÉVÉNEMENT QUEUED
  --------------------------------------------------
  */

  if (
    event ===
    "payout.queued"
  ) {

    return NextResponse.json(

      {
        success:
          true,

        processed:
          false,

        status:
          "queued",
      },

      {
        status:
          200,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 13
  ÉVÉNEMENT PROCESSING
  --------------------------------------------------
  */

  if (
    event ===
    "payout.processing"
  ) {

    /*
    On met à jour le statut.

    Pas de remboursement.
    Pas de crédit supplémentaire.
    */

    const db =
      getDatabase();


    await db
      .ref(
        `withdrawals/${withdrawal.id}`,
      )
      .update({

        status:
          "processing",

        providerStatus:
          "processing",

        payoutId:
          getPayoutId(
            payload,
          ) ??
          withdrawal.payoutId,

        updatedAt:
          Date.now(),
      });


    return NextResponse.json(

      {
        success:
          true,

        processed:
          true,

        status:
          "processing",
      },

      {
        status:
          200,
      },

    );
  }


  /*
  --------------------------------------------------
  ÉTAPE 14
  ÉVÉNEMENT COMPLETED
  --------------------------------------------------
  */

  if (
    event ===
    "payout.completed"
  ) {

    /*
    Si déjà completed,
    répondre OK sans refaire
    l'opération.

    Le webhook peut être envoyé
    plusieurs fois par le provider.
    */

    if (
      withdrawal.status ===
      "completed"
    ) {

      return NextResponse.json(

        {
          success:
            true,

          processed:
            false,

          alreadyProcessed:
            true,

          status:
            "completed",
        },

        {
          status:
            200,
        },

      );
    }


    /*
    Si déjà remboursé,
    un completed tardif ne doit PAS
    recréditer ou modifier le retrait.

    Cela protège contre un webhook
    arrivé dans le mauvais ordre.
    */

    if (
      withdrawal.status ===
      "refunded"
    ) {

      console.error(
        "[WITHDRAWAL_COMPLETED_AFTER_REFUND]",
        {
          withdrawalId:
            withdrawal.id,

          referenceId,
        },
      );


      return NextResponse.json(

        {
          success:
            false,

          error:
            "Retrait déjà remboursé.",
        },

        {
          status:
            409,
        },

      );
    }


    /*
    Marquer le webhook comme traité.

    Cela empêche un double traitement.
    */

    const processingResult =
      await markWebhookAsProcessed(

        withdrawal.id,

      );


    if (
      processingResult ===
      "already_processed"
    ) {

      return NextResponse.json(

        {
          success:
            true,

          processed:
            false,

          alreadyProcessed:
            true,
        },

        {
          status:
            200,
        },

      );
    }


    if (
      processingResult !==
      "processed"
    ) {

      return NextResponse.json(

        {
          success:
            false,

          error:
            "Impossible de verrouiller le traitement du webhook.",
        },

        {
          status:
            500,
        },

      );
    }


    /*
    Finaliser le retrait.

    Aucun montant supplémentaire
    n'est retiré du solde ici.

    Le solde a déjà été réservé
    lors de la création du retrait.
    */

    try {

      const completed =
        await completeWithdrawal(

          withdrawal.id,

          getPayoutId(
            payload,
          ),

          getFeeHtg(
            payload,
          ),

        );


      if (
        !completed
      ) {

        await rollbackWebhookProcessed(

          withdrawal.id,

        );


        return NextResponse.json(

          {
            success:
              false,

            error:
              "Impossible de finaliser le retrait.",
          },

          {
            status:
              500,
          },

        );
      }


      return NextResponse.json(

        {
          success:
            true,

          processed:
            true,

          status:
            "completed",
        },

        {
          status:
            200,
        },

      );


    } catch (
      error
    ) {

      console.error(
        "[WITHDRAWAL_COMPLETED_PROCESSING_ERROR]",
        {
          withdrawalId:
            withdrawal.id,

          error,
        },
      );


      await rollbackWebhookProcessed(

        withdrawal.id,

      );


      return NextResponse.json(

        {
          success:
            false,

          error:
            "Erreur lors de la finalisation du retrait.",
        },

        {
          status:
            500,
        },

      );
    }
  }


  /*
  --------------------------------------------------
  ÉTAPE 15
  ÉVÉNEMENT FAILED
  --------------------------------------------------
  */

  if (
    event ===
    "payout.failed"
  ) {

    /*
    Si déjà remboursé,
    ne rien faire.

    Cela protège contre les doublons.
    */

    if (
      withdrawal.status ===
      "refunded"
    ) {

      return NextResponse.json(

        {
          success:
            true,

          processed:
            false,

          alreadyProcessed:
            true,

          status:
            "refunded",
        },

        {
          status:
            200,
        },

      );
    }


    /*
    Si completed avant un failed tardif,
    on ne rembourse PAS.

    Le payout completed est définitif.
    */

    if (
      withdrawal.status ===
      "completed"
    ) {

      console.error(
        "[WITHDRAWAL_FAILED_AFTER_COMPLETED]",
        {
          withdrawalId:
            withdrawal.id,

          referenceId,
        },
      );


      return NextResponse.json(

        {
          success:
            false,

          error:
            "Le retrait est déjà confirmé comme complété.",
        },

        {
          status:
            409,
        },

      );
    }


    /*
    Marquer failed / refund_pending.
    */

    const markedFailed =
      await markWithdrawalFailed(

        withdrawal.id,

        getErrorMessage(
          payload,
        ),

      );


    if (
      !markedFailed
    ) {

      return NextResponse.json(

        {
          success:
            false,

          error:
            "Impossible de marquer le retrait comme échoué.",
        },

        {
          status:
            500,
        },

      );
    }


    /*
    ------------------------------------------------
    REMBOURSEMENT ATOMIQUE
    ------------------------------------------------

    Le remboursement :

    1. Vérifie fundsRefunded.
    2. Évite le double remboursement.
    3. Recrédite le montant.
    4. Marque refunded.
    5. Libère le verrou.

    ------------------------------------------------
    */

    try {

      const refundResult =
        await refundFailedWithdrawal(

          withdrawal.id,

        );


      if (
        !refundResult.success
      ) {

        console.error(
          "[WITHDRAWAL_REFUND_FAILED]",
          {
            withdrawalId:
              withdrawal.id,
            status:
              refundResult.status,
          },
        );


        /*
        IMPORTANT :

        Ne pas retourner 200.

        Le provider pourra renvoyer
        le webhook.

        Cependant, le statut refund_pending
        doit être traité par un worker/job
        de récupération si nécessaire.
        */

        return NextResponse.json(

          {
            success:
              false,

            status:
              "refund_pending",

            error:
              "Le remboursement n'a pas pu être finalisé.",
          },

          {
            status:
              500,
          },

        );
      }


      return NextResponse.json(

        {
          success:
            true,

          processed:
            true,

          status:
            "refunded",

          alreadyRefunded:
            refundResult.status === "already_refunded",
        },

        {
          status:
            200,
        },

      );


    } catch (
      error
    ) {

      console.error(
        "[WITHDRAWAL_REFUND_EXCEPTION]",
        {
          withdrawalId:
            withdrawal.id,

          error,
        },
      );


      return NextResponse.json(

        {
          success:
            false,

          status:
            "refund_pending",

          error:
            "Erreur lors du remboursement.",
        },

        {
          status:
            500,
        },

      );
    }
  }


  /*
  --------------------------------------------------
  ÉVÉNEMENT INCONNU
  --------------------------------------------------
  */

  console.warn(
    "[WITHDRAWAL_WEBHOOK_UNKNOWN_EVENT]",
    {
      event,
      referenceId,
    },
  );


  return NextResponse.json(

    {
      success:
        true,

      processed:
        false,

      message:
        "Événement reçu mais non traité.",
    },

    {
      status:
        200,
    },

  );
}