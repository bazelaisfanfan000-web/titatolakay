import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
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

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS =
  300;


/*
====================================================
TYPES
====================================================
*/

type DepositStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";


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

  idempotencyKey?:
    string;

  paymentUrl?:
    string |
    null;

  createdAt?:
    number;

  updatedAt?:
    number;

  completedAt?:
    number;

  moncashTransactionId?:
    string |
    null;

};


type MonCashWebhookEvent = {

  event?:
    string;

  reference?:
    string;

  referenceId?:
    string;

  amount?:
    number |
    string;

  status?:
    string;

  completedAt?:
    string |
    number |
    null;

  transactionId?:
    string |
    null;

  moncashTransactionId?:
    string |
    null;

};


/*
====================================================
RÉPONSE ERREUR
====================================================
*/

function jsonError(
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
VALIDATION SIGNATURE WEBHOOK
====================================================

IMPORTANT :

Cette fonction vérifie :

1. Timestamp
2. Anti-replay
3. HMAC SHA-256
4. Comparaison constant-time

====================================================
*/

function verifyWebhookSignature(
  rawBody: string,
  timestampHeader: string,
  signatureHeader: string,
  secret: string
): boolean {

  /*
  ================================================
  1. TIMESTAMP
  ================================================
  */

  const timestamp =
    Number(
      timestampHeader
    );


  if (
    !Number.isFinite(
      timestamp
    )
  ) {

    return false;

  }


  /*
  ================================================
  2. TIMESTAMP ACTUEL
  ================================================
  */

  const now =
    Math.floor(
      Date.now() /
      1000
    );


  /*
  ================================================
  3. PROTECTION ANTI-REPLAY
  ================================================
  */

  if (
    Math.abs(
      now -
      timestamp
    ) >
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS
  ) {

    return false;

  }


  /*
  ================================================
  4. NETTOYER LA SIGNATURE
  ================================================
  */

  const receivedSignature =
    signatureHeader
      .trim()
      .replace(
        /^sha256=/i,
        ""
      );


  if (
    !receivedSignature
  ) {

    return false;

  }


  /*
  ================================================
  5. CALCUL HMAC
  ================================================
  */

  const expectedSignature =
    createHmac(
      "sha256",
      secret
    )
      .update(
        rawBody,
        "utf8"
      )
      .digest(
        "hex"
      );


  /*
  ================================================
  6. CONVERSION BUFFER
  ================================================
  */

  let receivedBuffer:
    Buffer;

  let expectedBuffer:
    Buffer;


  try {

    receivedBuffer =
      Buffer.from(
        receivedSignature,
        "hex"
      );


    expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

  } catch {

    return false;

  }


  /*
  ================================================
  7. VÉRIFIER LONGUEUR
  ================================================
  */

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {

    return false;

  }


  /*
  ================================================
  8. COMPARAISON CONSTANT-TIME
  ================================================
  */

  try {

    return timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );

  } catch {

    return false;

  }

}


/*
====================================================
POST WEBHOOK MONCASHCONNECT
====================================================
*/

export async function POST(
  request: NextRequest
) {

  /*
  ==================================================
  1. RÉCUPÉRER LE SECRET WEBHOOK
  ==================================================
  */

  const webhookSecret =
    process.env.MCC_WEBHOOK_SECRET;


  if (
    !webhookSecret
  ) {

    console.error(
      "[MONCASH WEBHOOK] MCC_WEBHOOK_SECRET manquante."
    );


    return jsonError(
      "Configuration webhook manquante.",
      500
    );

  }


  /*
  ==================================================
  2. RÉCUPÉRER LES HEADERS
  ==================================================
  */

  const signatureHeader =
    request.headers.get(
      "x-mcc-signature"
    );


  const timestampHeader =
    request.headers.get(
      "x-mcc-timestamp"
    );


  if (
    !signatureHeader ||
    !timestampHeader
  ) {

    console.error(
      "[MONCASH WEBHOOK] Signature ou timestamp manquant."
    );


    return jsonError(
      "Signature webhook manquante.",
      401
    );

  }


  /*
  ==================================================
  3. LIRE LE BODY BRUT
  ==================================================

  IMPORTANT :

  On utilise text() avant JSON.parse().

  La signature HMAC doit être vérifiée
  sur le body brut.

  ==================================================
  */

  const rawBody =
    await request.text();


  if (
    !rawBody
  ) {

    return jsonError(
      "Body webhook vide.",
      400
    );

  }


  /*
  ==================================================
  4. VÉRIFIER LA SIGNATURE
  ==================================================
  */

  const signatureValid =
    verifyWebhookSignature(
      rawBody,
      timestampHeader,
      signatureHeader,
      webhookSecret
    );


  if (
    !signatureValid
  ) {

    console.error(
      "[MONCASH WEBHOOK] Signature invalide ou webhook expiré."
    );


    return jsonError(
      "Signature webhook invalide.",
      401
    );

  }


  /*
  ==================================================
  5. PARSER LE JSON
  ==================================================
  */

  let event:
    MonCashWebhookEvent;


  try {

    event =
      JSON.parse(
        rawBody
      );

  } catch {

    console.error(
      "[MONCASH WEBHOOK] JSON invalide."
    );


    return jsonError(
      "Payload JSON invalide.",
      400
    );

  }


  /*
  ==================================================
  6. ACCEPTER UNIQUEMENT PAYMENT COMPLETED
  ==================================================
  */

  if (
    event.event !==
    "payment.completed"
  ) {

    console.log(
      "[MONCASH WEBHOOK] Événement ignoré :",
      event.event
    );


    return NextResponse.json(
      {
        success:
          true,

        ignored:
          true,
      },
      {
        status:
          200,
      }
    );

  }


  /*
  ==================================================
  7. RÉCUPÉRER REFERENCE
  ==================================================

  Le code accepte :

  reference

  ou

  referenceId

  ==================================================
  */

  const reference =
    typeof event.reference ===
    "string"
      ? event.reference.trim()
      : typeof event.referenceId ===
        "string"
        ? event.referenceId.trim()
        : "";


  if (
    !reference
  ) {

    console.error(
      "[MONCASH WEBHOOK] Référence absente."
    );


    return jsonError(
      "Référence de paiement absente.",
      400
    );

  }


  /*
  ==================================================
  8. RÉCUPÉRER MONTANT
  ==================================================
  */

  const amount =
    Number(
      event.amount
    );


  if (
    !Number.isFinite(
      amount
    ) ||
    !Number.isInteger(
      amount
    ) ||
    amount <= 0
  ) {

    console.error(
      "[MONCASH WEBHOOK] Montant invalide :",
      event.amount
    );


    return jsonError(
      "Montant de paiement invalide.",
      400
    );

  }


  /*
  ==================================================
  9. VÉRIFIER LE STATUS
  ==================================================
  */

  if (
    event.status !==
    "completed"
  ) {

    console.error(
      "[MONCASH WEBHOOK] Status inattendu :",
      event.status
    );


    return jsonError(
      "Paiement non confirmé.",
      400
    );

  }


  /*
  ==================================================
  10. RECHERCHER LE DÉPÔT
  ==================================================
  */

  const depositsQuery =
    adminDB
      .ref(
        "deposits"
      )
      .orderByChild(
        "referenceId"
      )
      .equalTo(
        reference
      );


  const depositsSnapshot =
    await depositsQuery.once(
      "value"
    );


  /*
  ==================================================
  11. DÉPÔT INTROUVABLE
  ==================================================
  */

  if (
    !depositsSnapshot.exists()
  ) {

    console.error(
      "[MONCASH WEBHOOK] Dépôt introuvable :",
      reference
    );


    return jsonError(
      "Dépôt introuvable.",
      404
    );

  }


  /*
  ==================================================
  12. EXTRAIRE LES DÉPÔTS
  ==================================================
  */

  const depositsData =
    depositsSnapshot.val() as Record<
      string,
      DepositRecord
    >;


  const matchingDeposits =
    Object.entries(
      depositsData
    );


  /*
  ==================================================
  13. VÉRIFIER UNICITÉ
  ==================================================
  */

  if (
    matchingDeposits.length !==
    1
  ) {

    console.error(
      "[MONCASH WEBHOOK] Référence ambiguë :",
      reference
    );


    return jsonError(
      "Référence de dépôt non unique.",
      409
    );

  }


  /*
  ==================================================
  14. EXTRAIRE LE DÉPÔT
  ==================================================
  */

  const [
    depositId,
    deposit,
  ] =
    matchingDeposits[0];


  /*
  ==================================================
  15. VALIDATION UID
  ==================================================
  */

  const uid =
    typeof deposit.uid ===
    "string"
      ? deposit.uid.trim()
      : "";


  if (
    !uid
  ) {

    console.error(
      "[MONCASH WEBHOOK] UID absent.",
      depositId
    );


    return jsonError(
      "Dépôt invalide.",
      500
    );

  }


  /*
  ==================================================
  16. VÉRIFIER MONTANT DU DÉPÔT
  ==================================================
  */

  const depositAmount =
    Number(
      deposit.amount
    );


  if (
    !Number.isInteger(
      depositAmount
    ) ||
    depositAmount <= 0
  ) {

    console.error(
      "[MONCASH WEBHOOK] Montant interne invalide.",
      depositId
    );


    return jsonError(
      "Montant interne du dépôt invalide.",
      500
    );

  }


  /*
  ==================================================
  17. PROTECTION MONTANT
  ==================================================

  Le montant reçu de MonCashConnect
  doit être exactement le même que
  celui enregistré lors de la création
  du dépôt.

  ==================================================
  */

  if (
    depositAmount !==
    amount
  ) {

    console.error(
      "[MONCASH WEBHOOK] FRAUDE OU INCOHÉRENCE MONTANT.",
      {

        depositId,

        reference,

        expected:
          depositAmount,

        received:
          amount,

      }
    );


    return jsonError(
      "Le montant du paiement ne correspond pas au dépôt.",
      400
    );

  }


  /*
  ==================================================
  18. VÉRIFIER DEVISE
  ==================================================
  */

  if (
    deposit.currency !==
    "HTG"
  ) {

    console.error(
      "[MONCASH WEBHOOK] Devise invalide.",
      deposit.currency
    );


    return jsonError(
      "Devise de dépôt invalide.",
      400
    );

  }


  /*
  ==================================================
  19. RÉFÉRENCES
  ==================================================
  */

  const depositRef =
    adminDB.ref(
      `deposits/${depositId}`
    );


  const userRef =
    adminDB.ref(
      `users/${uid}`
    );


  const processedDepositRef =
    adminDB.ref(
      `users/${uid}/processedDeposits/${depositId}`
    );


  const ledgerRef =
    adminDB.ref(
      `walletLedger/deposit_${depositId}`
    );


  /*
  ==================================================
  20. LIRE L'UTILISATEUR
  ==================================================
  */

  const userSnapshot =
    await userRef.once(
      "value"
    );


  if (
    !userSnapshot.exists()
  ) {

    console.error(
      "[MONCASH WEBHOOK] Utilisateur introuvable.",
      uid
    );


    return jsonError(
      "Utilisateur du dépôt introuvable.",
      500
    );

  }


  /*
  ==================================================
  21. VÉRIFIER SI DÉJÀ CRÉDITÉ
  ==================================================
  */

  const existingProcessedSnapshot =
    await processedDepositRef.once(
      "value"
    );


  if (
    existingProcessedSnapshot.exists()
  ) {

    console.log(
      "[MONCASH WEBHOOK] DÉPÔT DÉJÀ CRÉDITÉ.",
      {
        depositId,

        uid,

        reference,
      }
    );


    /*
    ================================================
    IMPORTANT

    Le webhook peut être renvoyé plusieurs fois.

    On ne recrédite JAMAIS le wallet.

    ================================================
    */

    return NextResponse.json(
      {

        success:
          true,

        duplicate:
          true,

        alreadyProcessed:
          true,

        depositId,

      },
      {
        status:
          200,
      }
    );

  }


  /*
  ==================================================
  22. VÉRIFIER LE STATUT DU DÉPÔT
  ==================================================
  */

  if (
    deposit.status ===
    "completed"
  ) {

    console.log(
      "[MONCASH WEBHOOK] Dépôt déjà marqué completed.",
      depositId
    );


    return NextResponse.json(
      {

        success:
          true,

        duplicate:
          true,

        depositId,

      },
      {
        status:
          200,
      }
    );

  }


  /*
  ==================================================
  23. CALCUL DU NOUVEAU SOLDE
  ==================================================
  */

  const currentUser =
    userSnapshot.val() as Record<
      string,
      unknown
    >;


  const currentBalance =
    Number(
      currentUser.balance ||
      0
    );


  if (
    !Number.isFinite(
      currentBalance
    ) ||
    currentBalance < 0
  ) {

    console.error(
      "[MONCASH WEBHOOK] Solde utilisateur invalide.",
      {
        uid,

        currentBalance,
      }
    );


    return jsonError(
      "Solde utilisateur invalide.",
      500
    );

  }


  /*
  ==================================================
  24. NOUVEAU SOLDE
  ==================================================
  */

  const newBalance =
    currentBalance +
    amount;


  /*
  ==================================================
  25. ID LEDGER
  ==================================================
  */

  const ledgerId =
    `deposit_${depositId}`;


  /*
  ==================================================
  26. TIMESTAMP FINAL
  ==================================================
  */

  const completedAt =
    Date.now();


  /*
  ==================================================
  27. TRANSACTION ATOMIQUE DE PROTECTION
  ==================================================

  Cette transaction sert à réserver
  définitivement le dépôt.

  Si deux webhooks arrivent exactement
  en même temps :

  Webhook A :
  processedDeposits absent

  Webhook B :
  processedDeposits absent

  Firebase arbitre les écritures concurrentes.

  Un seul webhook pourra réussir.

  ==================================================
  */

  const reservationTransaction =
    await processedDepositRef.transaction(
      (
        currentData
      ) => {

        /*
        ============================================
        SI DÉJÀ TRAITÉ
        ============================================
        */

        if (
          currentData !==
          null
        ) {

          return;

        }


        /*
        ============================================
        RÉSERVER LE DÉPÔT
        ============================================
        */

        return {

          depositId,

          uid,

          amount,

          referenceId:
            reference,

          status:
            "processing",

          createdAt:
            completedAt,

        };

      }
    );


  /*
  ==================================================
  28. TRANSACTION NON COMMIT
  ==================================================
  */

  if (
    !reservationTransaction.committed
  ) {

    console.log(
      "[MONCASH WEBHOOK] Dépôt déjà réservé ou traité.",
      {
        depositId,

        uid,
      }
    );


    return NextResponse.json(
      {

        success:
          true,

        duplicate:
          true,

        depositId,

      },
      {
        status:
          200,
      }
    );

  }


  /*
  ==================================================
  29. MISE À JOUR ATOMIQUE MULTI-CHEMINS
  ==================================================

  IMPORTANT :

  Firebase Realtime Database permet une mise
  à jour multi-chemins.

  Toutes ces écritures sont envoyées ensemble :

  users/{uid}/balance

  users/{uid}/processedDeposits/{depositId}

  deposits/{depositId}

  walletLedger/deposit_{depositId}

  ==================================================
  */

  const atomicUpdates:
    Record<
      string,
      unknown
    > = {


      /*
      ==============================================
      SOLDE UTILISATEUR
      ==============================================
      */

      [`users/${uid}/balance`]:
        newBalance,


      /*
      ==============================================
      MARQUEUR ANTI DOUBLE-CRÉDIT
      ==============================================
      */

      [`users/${uid}/processedDeposits/${depositId}`]:
        {

          depositId,

          uid,

          amount,

          referenceId:
            reference,

          status:
            "completed",

          processedAt:
            completedAt,

        },


      /*
      ==============================================
      DÉPÔT
      ==============================================
      */

      [`deposits/${depositId}/status`]:
        "completed",


      [`deposits/${depositId}/completedAt`]:
        completedAt,


      [`deposits/${depositId}/updatedAt`]:
        completedAt,


      [`deposits/${depositId}/moncashTransactionId`]:
        event.moncashTransactionId ||
        event.transactionId ||
        null,


      /*
      ==============================================
      LEDGER
      ==============================================
      */

      [`walletLedger/${ledgerId}`]:
        {

          ledgerId,

          uid,

          type:
            "deposit",

          direction:
            "credit",

          amount,

          currency:
            "HTG",

          depositId,

          referenceId:
            reference,

          provider:
            "moncashconnect",

          status:
            "completed",

          createdAt:
            completedAt,

        },

    };


  /*
  ==================================================
  30. EXÉCUTER L'UPDATE ATOMIQUE
  ==================================================
  */

  try {

    await adminDB
      .ref()
      .update(
        atomicUpdates
      );

  } catch (
    atomicError
  ) {

    console.error(
      "[MONCASH WEBHOOK] ERREUR UPDATE ATOMIQUE.",
      atomicError
    );


    /*
    ================================================
    ATTENTION

    La réservation existe déjà.

    On la remet en état failed pour permettre
    un nouveau traitement du webhook.

    ================================================
    */

    try {

      await processedDepositRef.set(
        {

          depositId,

          uid,

          amount,

          referenceId:
            reference,

          status:
            "failed",

          error:
            "ATOMIC_UPDATE_FAILED",

          failedAt:
            Date.now(),

        }
      );

    } catch (
      rollbackError
    ) {

      console.error(
        "[MONCASH WEBHOOK] ERREUR ROLLBACK.",
        rollbackError
      );

    }


    return jsonError(
      "Impossible de finaliser le crédit du dépôt.",
      500
    );

  }


  /*
  ==================================================
  31. LOG FINAL
  ==================================================
  */

  console.log(
    "[MONCASH WEBHOOK] DÉPÔT CRÉDITÉ AVEC SUCCÈS.",
    {

      depositId,

      uid,

      amount,

      oldBalance:
        currentBalance,

      newBalance,

      reference,

      ledgerId,

    }
  );


  /*
  ==================================================
  32. RÉPONSE FINALE
  ==================================================
  */

  return NextResponse.json(
    {

      success:
        true,

      processed:
        true,

      atomic:
        true,

      depositId,

      amount,

    },
    {
      status:
        200,
    }
  );

}