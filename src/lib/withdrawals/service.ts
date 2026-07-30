/*
====================================================
TiTaTo - Withdrawal Service
====================================================

Service métier principal des retraits.

FLOW :

Client
   ↓
Validation
   ↓
Limites quotidiennes
   ↓
Réservation atomique des fonds
   ↓
Création withdrawal
   ↓
Appel MonCashConnect
   ↓
queued / processing
   ↓
Webhook
   ↓
completed

ou

failed
   ↓
refund_pending
   ↓
refundFailedWithdrawal()
   ↓
refunded


IMPORTANT :

Une erreur réseau / timeout ne signifie PAS
que le payout a échoué.

Dans ce cas :

- ne pas rembourser automatiquement
- ne pas créer un deuxième payout
- conserver processing
- garder le même referenceId
- attendre une vérification provider/webhook


====================================================
*/


import {
  randomUUID,
} from "crypto";


import {
  getDatabase,
} from "firebase-admin/database";


import type {
  CreateWithdrawalInput,
  Withdrawal,
  WithdrawalServiceResult,
} from "./types";


import {
  validateWithdrawalInput,
  validateWithdrawalLimits,
} from "./validation";


import {
  reserveWithdrawal,
  markWithdrawalProcessing,
  markWithdrawalFailed,
  refundFailedWithdrawal,
} from "./atomic";


import {
  createMonCashPayout,
  isPayoutAccepted,
} from "./provider";


/*
====================================================
TYPES INTERNES
====================================================
*/

interface ActiveWithdrawalResult {

  hasActiveWithdrawal: boolean;

  withdrawalId?: string;
}


interface DailyWithdrawalStats {

  totalAmount: number;

  count: number;
}


/*
====================================================
STATUTS ACTIFS
====================================================

Un retrait avec ces statuts bloque
la création d'un autre retrait.

====================================================
*/

const ACTIVE_WITHDRAWAL_STATUSES =
  new Set<Withdrawal["status"]>([

    "pending",

    "processing",

    "refund_pending",

  ]);


/*
====================================================
VALIDATION UID
====================================================
*/

function isValidUid(
  uid: string,
): boolean {

  return (

    typeof uid === "string" &&

    uid.trim().length > 0

  );
}


/*
====================================================
VALIDATION WITHDRAWAL ID
====================================================
*/

function isValidWithdrawalId(
 withdrawalId: string,
): boolean {

  return (

    typeof withdrawalId === "string" &&

    withdrawalId.trim().length > 0

  );
}


/*
====================================================
DATE DU JOUR
====================================================
*/

function getDayKey(
  timestamp: number = Date.now(),
): string {

  return new Date(
    timestamp,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}


/*
====================================================
VÉRIFIER RETRAIT ACTIF
====================================================

IMPORTANT :

Cette fonction est seulement une vérification
informative.

La vraie protection contre deux retraits
simultanés doit rester dans atomic.ts.

====================================================
*/

export async function hasActiveWithdrawal(
  uid: string,
): Promise<ActiveWithdrawalResult> {

  if (
    !isValidUid(uid)
  ) {

    return {

      hasActiveWithdrawal:
        false,

    };
  }


  const db =
    getDatabase();


  const snapshot =
    await db

      .ref(
        "withdrawals",
      )

      .orderByChild(
        "uid",
      )

      .equalTo(
        uid,
      )

      .get();


  if (
    !snapshot.exists()
  ) {

    return {

      hasActiveWithdrawal:
        false,

    };
  }


  const withdrawals =
    snapshot.val() as Record<
      string,
      Withdrawal
    >;


  for (
    const [
      withdrawalId,
      withdrawal,
    ]
    of Object.entries(
      withdrawals,
    )
  ) {

    if (
      !withdrawal ||
      typeof withdrawal !== "object"
    ) {

      continue;
    }


    if (
      ACTIVE_WITHDRAWAL_STATUSES.has(
        withdrawal.status,
      )
    ) {

      return {

        hasActiveWithdrawal:
          true,

        withdrawalId,

      };
    }
  }


  return {

    hasActiveWithdrawal:
      false,

  };
}


/*
====================================================
STATISTIQUES QUOTIDIENNES
====================================================

Compte uniquement :

- pending
- processing
- completed
- refund_pending

Les retraits refunded ne comptent plus.

Les failed non remboursés ne sont pas comptés
comme retraits définitifs.

====================================================
*/

async function getDailyWithdrawalStats(
  uid: string,
): Promise<DailyWithdrawalStats> {

  const db =
    getDatabase();


  const snapshot =
    await db

      .ref(
        "withdrawals",
      )

      .orderByChild(
        "uid",
      )

      .equalTo(
        uid,
      )

      .get();


  if (
    !snapshot.exists()
  ) {

    return {

      totalAmount:
        0,

      count:
        0,

    };
  }


  const withdrawals =
    snapshot.val() as Record<
      string,
      Withdrawal
    >;


  const today =
    getDayKey();


  let totalAmount =
    0;


  let count =
    0;


  for (
    const withdrawal
    of Object.values(
      withdrawals,
    )
  ) {

    if (
      !withdrawal ||
      typeof withdrawal !== "object"
    ) {

      continue;
    }


    if (
      typeof withdrawal.createdAt !==
      "number"
    ) {

      continue;
    }


    if (
      getDayKey(
        withdrawal.createdAt,
      ) !== today
    ) {

      continue;
    }


    if (
      withdrawal.status ===
      "refunded"
    ) {

      continue;
    }


    if (
      withdrawal.status !==
        "pending" &&

      withdrawal.status !==
        "processing" &&

      withdrawal.status !==
        "refund_pending" &&

      withdrawal.status !==
        "completed"
    ) {

      continue;
    }


    const amount =
      Number(
        withdrawal.amount,
      );


    if (
      !Number.isFinite(
        amount,
      ) ||

      amount <= 0
    ) {

      continue;
    }


    totalAmount +=
      amount;


    count +=
      1;
  }


  return {

    totalAmount,

    count,

  };
}


/*
====================================================
METTRE À JOUR LES DONNÉES PROVIDER
====================================================
*/

async function updateWithdrawalProviderData(
  withdrawalId: string,

  data: {

    payoutId?: string;

    providerStatus?:
      | "queued"
      | "processing"
      | "completed"
      | "failed";

    feeHtg?: number;

    errorMessage?: string;

  },

): Promise<boolean> {

  if (
    !isValidWithdrawalId(
      withdrawalId,
    )
  ) {

    return false;
  }


  const db =
    getDatabase();


  const withdrawalRef =
    db.ref(
      `withdrawals/${withdrawalId}`,
    );


  const snapshot =
    await withdrawalRef.get();


  if (
    !snapshot.exists()
  ) {

    return false;
  }


  const withdrawal =
    snapshot.val() as Withdrawal;


  const updates:
    Record<
      string,
      unknown
    > = {

    updatedAt:
      Date.now(),

  };


  if (
    typeof data.payoutId ===
    "string" &&

    data.payoutId.trim().length > 0
  ) {

    updates.payoutId =
      data.payoutId.trim();
  }


  if (
    data.providerStatus
  ) {

    updates.providerStatus =
      data.providerStatus;
  }


  if (
    typeof data.feeHtg ===
      "number" &&

    Number.isFinite(
      data.feeHtg,
    ) &&

    data.feeHtg >= 0
  ) {

    updates.feeHtg =
      data.feeHtg;


    updates.totalCostHtg =
      withdrawal.amount +
      data.feeHtg;
  }


  if (
    typeof data.errorMessage ===
    "string"
  ) {

    updates.errorMessage =
      data.errorMessage;
  }


  try {

    await withdrawalRef.update(
      updates,
    );


    return true;

  } catch (
    error
  ) {

    console.error(

      "[WITHDRAWAL_PROVIDER_UPDATE_ERROR]",

      {

        withdrawalId,

        error,

      },

    );


    return false;
  }
}


/*
====================================================
CRÉER UNE DEMANDE DE RETRAIT
====================================================
*/

export async function createWithdrawal(
  uid: string,

  input: unknown,

): Promise<WithdrawalServiceResult> {


  /*
  --------------------------------------------------
  1. VALIDATION UID
  --------------------------------------------------
  */

  if (
    !isValidUid(
      uid,
    )
  ) {

    return {

      success:
        false,

      error:
        "Utilisateur invalide.",

    };
  }


  /*
  --------------------------------------------------
  2. VALIDATION INPUT
  --------------------------------------------------
  */

  const validation =
    validateWithdrawalInput(
      input,
    );


  if (
    !validation.valid ||
    !validation.data
  ) {

    return {

      success:
        false,

      error:
        validation.error ??
        "Données de retrait invalides.",

    };
  }


  const withdrawalInput:
    CreateWithdrawalInput =
      validation.data;


  /*
  --------------------------------------------------
  3. VÉRIFIER RETRAIT ACTIF
  --------------------------------------------------
  */

  try {

    const active =
      await hasActiveWithdrawal(
        uid,
      );


    if (
      active.hasActiveWithdrawal
    ) {

      return {

        success:
          false,

        withdrawalId:
          active.withdrawalId,

        status:
          "processing",

        error:
          "Vous avez déjà un retrait en cours.",

      };
    }

  } catch (
    error
  ) {

    console.error(

      "[WITHDRAWAL_ACTIVE_CHECK_ERROR]",

      error,

    );


    return {

      success:
        false,

      error:
        "Impossible de vérifier les retraits actifs.",

    };
  }


  /*
  --------------------------------------------------
  4. VÉRIFIER LIMITES QUOTIDIENNES
  --------------------------------------------------
  */

  let dailyStats:
    DailyWithdrawalStats;


  try {

    dailyStats =
      await getDailyWithdrawalStats(
        uid,
      );

  } catch (
    error
  ) {

    console.error(

      "[WITHDRAWAL_DAILY_STATS_ERROR]",

      error,

    );


    return {

      success:
        false,

      error:
        "Impossible de vérifier votre limite quotidienne.",

    };
  }


  /*
  --------------------------------------------------
  5. VALIDER LIMITES
  --------------------------------------------------
  */

  const limits =
    validateWithdrawalLimits({

      amount:
        withdrawalInput.amount,

      dailyWithdrawalAmount:
        dailyStats.totalAmount,

      dailyWithdrawalCount:
        dailyStats.count,

    });


  if (
    !limits.valid
  ) {

    return {

      success:
        false,

      error:
        limits.error ??
        "Limite de retrait atteinte.",

    };
  }


  /*
  --------------------------------------------------
  6. IDENTIFIANTS
  --------------------------------------------------
  */

  const withdrawalId =
    `withdrawal_${randomUUID()}`;


  /*
  IMPORTANT :

  Le même referenceId doit être utilisé
  pendant toute la durée du payout.

  Ne jamais créer un deuxième referenceId
  pour un timeout.
  */

  const referenceId =
    withdrawalId;


  /*
  --------------------------------------------------
  7. RÉSERVATION ATOMIQUE
  --------------------------------------------------
  */

  let reservation;


  try {

    reservation =
      await reserveWithdrawal({

        uid,

        withdrawalId,

        amount:
          withdrawalInput.amount,

        referenceId,

        moncashNumber:
          withdrawalInput.moncashNumber,

      });

  } catch (
    error
  ) {

    console.error(

      "[WITHDRAWAL_RESERVATION_ERROR]",

      {

        uid,

        withdrawalId,

        error,

      },

    );


    return {

      success:
        false,

      error:
        "Impossible de réserver le montant du retrait.",

    };
  }


  /*
  --------------------------------------------------
  8. RÉSERVATION REFUSÉE
  --------------------------------------------------
  */

  if (
    !reservation.success
  ) {

    switch (
      reservation.reason
    ) {

      case "insufficient_balance":

        return {

          success:
            false,

          error:
            "Solde insuffisant.",

        };


      case "active_withdrawal":

        return {

          success:
            false,

          error:
            "Vous avez déjà un retrait en cours.",

        };


      case "invalid_amount":

        return {

          success:
            false,

          error:
            "Montant de retrait invalide.",

        };


      case "already_reserved":

        return {

          success:
            false,

          error:
            "Cette demande de retrait existe déjà.",

        };


      case "user_not_found":

        return {

          success:
            false,

          error:
            "Compte utilisateur introuvable.",

        };


      case "database_error":

        return {

          success:
            false,

          error:
            "Erreur de base de données lors de la réservation.",

        };


      default:

        return {

          success:
            false,

          error:
            "Impossible de réserver le montant du retrait.",

        };
    }
  }


  /*
  --------------------------------------------------
  9. APPEL MONCASHCONNECT
  --------------------------------------------------
  */

  let payout;


  try {

    payout =
      await createMonCashPayout({

        amount:
          withdrawalInput.amount,

        moncashNumber:
          withdrawalInput.moncashNumber,

        referenceId,

      });

  } catch (
    error
  ) {

    /*
    IMPORTANT :

    Une exception réseau peut signifier
    que MonCashConnect a reçu la demande
    mais que notre serveur n'a pas reçu
    la réponse.

    Donc :

    PAS DE REFUND.

    PAS DE DEUXIÈME PAYOUT.

    */

    console.error(

      "[WITHDRAWAL_PROVIDER_EXCEPTION]",

      {

        withdrawalId,

        referenceId,

        error,

      },

    );


    await updateWithdrawalProviderData(

      withdrawalId,

      {

        providerStatus:
          "processing",

        errorMessage:
          "Réponse du fournisseur inconnue. Vérification nécessaire.",

      },

    );


    await markWithdrawalProcessing(
      withdrawalId,
    );


    return {

      success:
        true,

      withdrawalId,

      status:
        "processing",

      message:
        "Votre demande de retrait est en cours de vérification.",

    };
  }


  /*
  --------------------------------------------------
  10. PAYOUT ACCEPTÉ
  --------------------------------------------------
  */

  if (
    isPayoutAccepted(
      payout,
    )
  ) {

    await updateWithdrawalProviderData(

      withdrawalId,

      {

        payoutId:
          payout.payoutId,

        providerStatus:
          payout.status ===
          "unknown"

            ? undefined

            : payout.status,

        feeHtg:
          payout.feeHtg,

      },

    );


    /*
    ------------------------------------------------
    IMPORTANT

    Même si MonCashConnect répond completed,
    la confirmation finale doit venir du webhook
    signé ou d'une vérification fiable du provider.

    On ne crédite / libère rien ici.
    ------------------------------------------------
    */

    const processingMarked =
      await markWithdrawalProcessing(
        withdrawalId,
      );


    if (
      !processingMarked
    ) {

      console.error(

        "[WITHDRAWAL_PROCESSING_MARK_FAILED]",

        {

          withdrawalId,

          referenceId,

        },

      );


      /*
      NE PAS REFUND.

      Le payout peut être accepté par le provider.
      Il faut donc laisser le retrait vérifiable.
      */

      return {

        success:
          true,

        withdrawalId,

        status:
          "processing",

        message:
          "Le retrait a été envoyé. Son état est en cours de vérification.",

      };
    }


    return {

      success:
        true,

      withdrawalId,

      status:
        "processing",

      message:
        "Votre demande de retrait a été envoyée et est en cours de traitement.",

    };
  }


  /*
  --------------------------------------------------
  11. PAYOUT REFUSÉ EXPLICITEMENT
  --------------------------------------------------

  IMPORTANT :

  Ici seulement, le provider a clairement confirmé
  que le payout n'a PAS été créé / exécuté.

  On peut donc commencer le remboursement.

  --------------------------------------------------
  */

  const markedFailed =
    await markWithdrawalFailed(

      withdrawalId,

      payout.error ??
      "MonCashConnect a refusé le retrait.",

    );


  if (
    !markedFailed
  ) {

    return {

      success:
        false,

      withdrawalId,

      status:
        "failed",

      error:
        "Le retrait a été refusé, mais son état doit être vérifié manuellement.",

    };
  }


  /*
  --------------------------------------------------
  12. REMBOURSEMENT ATOMIQUE
  --------------------------------------------------

  refundFailedWithdrawal() doit être idempotent.

  Si le serveur est interrompu après le crédit,
  une deuxième tentative ne doit pas recréditer
  le joueur.

  --------------------------------------------------
  */

  let refund;


  try {

    refund =
      await refundFailedWithdrawal(
        withdrawalId,
      );

  } catch (
    error
  ) {

    console.error(

      "[WITHDRAWAL_REFUND_ERROR]",

      {

        withdrawalId,

        error,

      },

    );


    return {

      success:
        false,

      withdrawalId,

      status:
        "refund_pending",

      error:
        "Le retrait a été refusé. Le remboursement est en cours de traitement.",

    };
  }


  /*
  --------------------------------------------------
  13. REMBOURSEMENT TERMINÉ
  --------------------------------------------------
  */

  if (
    refund.success
  ) {

    return {

      success:
        false,

      withdrawalId,

      status:
        "refunded",

      error:
        "Le fournisseur de paiement a refusé le retrait. Le montant a été remboursé sur votre solde.",

    };
  }


  /*
  --------------------------------------------------
  14. REMBOURSEMENT EN ATTENTE
  --------------------------------------------------
  */

  return {

    success:
      false,

    withdrawalId,

    status:
      "refund_pending",

    error:
      "Le fournisseur de paiement a refusé le retrait. Le remboursement est en cours de traitement.",

  };
}


/*
====================================================
RÉCUPÉRER UN RETRAIT PAR ID
====================================================
*/

export async function getWithdrawalById(
  uid: string,

  withdrawalId: string,

): Promise<Withdrawal | null> {

  if (
    !isValidUid(
      uid,
    )
  ) {

    return null;
  }


  if (
    !isValidWithdrawalId(
      withdrawalId,
    )
  ) {

    return null;
  }


  const db =
    getDatabase();


  const snapshot =
    await db

      .ref(
        `withdrawals/${withdrawalId}`,
      )

      .get();


  if (
    !snapshot.exists()
  ) {

    return null;
  }


  const withdrawal =
    snapshot.val() as Withdrawal;


  if (
    !withdrawal ||
    withdrawal.uid !== uid
  ) {

    return null;
  }


  return withdrawal;
}


/*
====================================================
RÉCUPÉRER TOUS LES RETRAITS D'UN UTILISATEUR
====================================================
*/

export async function getUserWithdrawals(
  uid: string,
): Promise<Withdrawal[]> {

  if (
    !isValidUid(
      uid,
    )
  ) {

    return [];
  }


  const db =
    getDatabase();


  const snapshot =
    await db

      .ref(
        "withdrawals",
      )

      .orderByChild(
        "uid",
      )

      .equalTo(
        uid,
      )

      .get();


  if (
    !snapshot.exists()
  ) {

    return [];
  }


  const withdrawals =
    snapshot.val() as Record<
      string,
      Withdrawal
    >;


  return Object.values(
    withdrawals,
  )

    .filter(

      (
        withdrawal,
      ) =>

        Boolean(

          withdrawal &&

          withdrawal.uid === uid

        ),

    )

    .sort(

      (
        a,

        b,
      ) =>

        (
          Number(
            b.createdAt,
          ) || 0
        )

        -

        (
          Number(
            a.createdAt,
          ) || 0
        ),

    );
}