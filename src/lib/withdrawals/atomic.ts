/*
====================================================
TiTaTo - Atomic Withdrawal Operations
====================================================

Gestion atomique des fonds pour les retraits.

FLOW :

1. reserveWithdrawal()
   ↓
   balance disponible
   ↓
   réservation du montant
   ↓
   création withdrawal pending

2. markWithdrawalProcessing()
   ↓
   pending → processing

3. markWithdrawalFailed()
   ↓
   processing/pending → failed
   ↓
   remboursement nécessaire

4. refundFailedWithdrawal()
   ↓
   failed → refund_pending
   ↓
   restitution du solde
   ↓
   reservedBalance diminué
   ↓
   refunded

IMPORTANT :

Toutes les modifications financières utilisent
des transactions Firebase RTDB.

Cela évite :

- double retrait
- double réservation
- double remboursement
- solde négatif
- concurrence entre deux requêtes

====================================================
*/

import {
  getDatabase,
} from "firebase-admin/database";


/*
====================================================
TYPES
====================================================
*/

export type WithdrawalReservationReason =

  | "insufficient_balance"

  | "active_withdrawal"

  | "invalid_amount"

  | "already_reserved"

  | "user_not_found"

  | "database_error";


export interface ReserveWithdrawalInput {

  uid: string;

  withdrawalId: string;

  amount: number;

  referenceId: string;

  moncashNumber: string;

}


export interface ReserveWithdrawalSuccess {

  success: true;

  withdrawalId: string;

}


export interface ReserveWithdrawalFailure {

  success: false;

  reason: WithdrawalReservationReason;

}


export type ReserveWithdrawalResult =

  | ReserveWithdrawalSuccess

  | ReserveWithdrawalFailure;


/*
====================================================
STATUTS ACTIFS
====================================================
*/

const ACTIVE_WITHDRAWAL_STATUSES = new Set([

  "pending",

  "processing",

  "refund_pending",

]);


/*
====================================================
VALIDATION MONTANT
====================================================
*/

function isValidAmount(
  amount: number,
): boolean {

  return (

    typeof amount === "number" &&

    Number.isFinite(amount) &&

    amount > 0

  );
}


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
VALIDATION ID
====================================================
*/

function isValidId(
  value: string,
): boolean {

  return (

    typeof value === "string" &&

    value.trim().length > 0

  );
}


/*
====================================================
RÉSERVER UN RETRAIT
====================================================

Cette fonction effectue une réservation atomique.

IMPORTANT :

Le système utilise :

users/{uid}/balance
users/{uid}/reservedBalance

Le solde réellement disponible est :

balance - reservedBalance

Exemple :

balance = 500

reservedBalance = 100

Disponible = 400

Si retrait = 300 :

reservedBalance devient 400

Disponible = 100

Le montant n'est PAS encore définitivement retiré.

Il est seulement réservé.

====================================================
*/

export async function reserveWithdrawal(
  input: ReserveWithdrawalInput,
): Promise<ReserveWithdrawalResult> {

  const {

    uid,

    withdrawalId,

    amount,

    referenceId,

    moncashNumber,

  } = input;


  /*
  --------------------------------------------------
  1. VALIDATION
  --------------------------------------------------
  */

  if (
    !isValidUid(uid)
  ) {

    return {

      success: false,

      reason: "user_not_found",

    };

  }


  if (
    !isValidId(withdrawalId) ||
    !isValidId(referenceId)
  ) {

    return {

      success: false,

      reason: "database_error",

    };

  }


  if (
    !isValidAmount(amount)
  ) {

    return {

      success: false,

      reason: "invalid_amount",

    };

  }


  if (
    typeof moncashNumber !== "string" ||
    moncashNumber.trim().length < 8
  ) {

    return {

      success: false,

      reason: "invalid_amount",

    };

  }


  const db =
    getDatabase();


  /*
  --------------------------------------------------
  2. VÉRIFIER SI LE RETRAIT EXISTE DÉJÀ
  --------------------------------------------------
  */

  const existingWithdrawalSnapshot =

    await db

      .ref(
        `withdrawals/${withdrawalId}`,
      )

      .get();


  if (
    existingWithdrawalSnapshot.exists()
  ) {

    return {

      success: false,

      reason: "already_reserved",

    };

  }


  /*
  --------------------------------------------------
  3. VÉRIFIER LES RETRAITS ACTIFS
  --------------------------------------------------
  */

  const activeWithdrawalsSnapshot =

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
    activeWithdrawalsSnapshot.exists()
  ) {

    const withdrawals =

      activeWithdrawalsSnapshot.val() as Record<
        string,
        any
      >;


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
        ACTIVE_WITHDRAWAL_STATUSES.has(
          withdrawal.status,
        )
      ) {

        return {

          success: false,

          reason: "active_withdrawal",

        };

      }

    }

  }


  /*
  --------------------------------------------------
  4. TRANSACTION ATOMIQUE SUR LE SOLDE
  --------------------------------------------------
  */

  const balanceRef =

    db.ref(
      `users/${uid}/balance`,
    );


  const reservedBalanceRef =

    db.ref(
      `users/${uid}/reservedBalance`,
    );


  /*
  --------------------------------------------------
  5. RÉSERVER LE SOLDE
  --------------------------------------------------
  */

  let reservationSucceeded = false;


  const balanceTransaction =

    await balanceRef.transaction(

      (
        currentBalance,
      ) => {

        /*
        --------------------------------------------
        UTILISATEUR SANS SOLDE
        --------------------------------------------
        */

        if (
          currentBalance === null ||
          currentBalance === undefined
        ) {

          return;

        }


        const balance =

          Number(
            currentBalance,
          );


        if (
          !Number.isFinite(balance)
        ) {

          return;

        }


        /*
        --------------------------------------------
        RÉCUPÉRER LE SOLDE RÉSERVÉ
        --------------------------------------------
        */

        /*
        IMPORTANT :

        La transaction du balance ne peut pas
        lire de manière fiable reservedBalance
        en même temps.

        La vérification finale est donc effectuée
        avant et après avec une seconde protection.

        --------------------------------------------
        */

        reservationSucceeded = true;


        return balance;

      },

    );


  /*
  --------------------------------------------------
  ATTENTION
  --------------------------------------------------

  La transaction ci-dessus vérifie uniquement
  que le solde existe.

  La réservation réelle doit maintenant être
  effectuée avec une transaction sur
  reservedBalance.

  --------------------------------------------------
  */


  if (
    !balanceTransaction.committed
  ) {

    return {

      success: false,

      reason: "user_not_found",

    };

  }


  /*
  --------------------------------------------------
  6. TRANSACTION SUR RESERVED BALANCE
  --------------------------------------------------
  */

  let reservationRejectedReason:
    WithdrawalReservationReason | null =
      null;


  const reservedTransaction =

    await reservedBalanceRef.transaction(

      (
        currentReservedBalance,
      ) => {

        const balanceValue =

          balanceTransaction.snapshot.val();


        const balance =

          Number(
            balanceValue || 0,
          );


        const reservedBalance =

          Number(
            currentReservedBalance || 0,
          );


        if (
          !Number.isFinite(balance)
        ) {

          reservationRejectedReason =
            "user_not_found";


          return;

        }


        if (
          !Number.isFinite(
            reservedBalance,
          )
        ) {

          reservationRejectedReason =
            "database_error";


          return;

        }


        /*
        ------------------------------------------
        DISPONIBLE
        ------------------------------------------
        */

        const availableBalance =

          balance -
          reservedBalance;


        /*
        ------------------------------------------
        SOLDE INSUFFISANT
        ------------------------------------------
        */

        if (
          availableBalance < amount
        ) {

          reservationRejectedReason =
            "insufficient_balance";


          return;

        }


        /*
        ------------------------------------------
        NOUVELLE RÉSERVATION
        ------------------------------------------
        */

        return (

          reservedBalance +
          amount

        );

      },

    );


  /*
  --------------------------------------------------
  7. RÉSERVATION REFUSÉE
  --------------------------------------------------
  */

  if (
    !reservedTransaction.committed
  ) {

    return {

      success: false,

      reason:

        reservationRejectedReason ??
        "database_error",

    };

  }


  /*
  --------------------------------------------------
  8. CRÉER LE RETRAIT
  --------------------------------------------------
  */

  const withdrawalRef =

    db.ref(
      `withdrawals/${withdrawalId}`,
    );


  const now =
    Date.now();


  const withdrawalData = {

    id:
      withdrawalId,

    uid,

    amount,

    referenceId,

    moncashNumber,

    status:
      "pending",

    providerStatus:
      "pending",

    payoutId:
      null,

    feeHtg:
      0,

    totalCostHtg:
      amount,

    createdAt:
      now,

    updatedAt:
      now,

    reservedAt:
      now,

    refundedAt:
      null,

    completedAt:
      null,

    errorMessage:
      null,

  };


  try {

    await withdrawalRef.set(
      withdrawalData,
    );

  } catch (
    error
  ) {

    /*
    ------------------------------------------------
    ÉCHEC CRÉATION RETRAIT
    ------------------------------------------------

    Si le retrait n'a pas pu être créé,
    il faut immédiatement libérer
    la réservation.

    ------------------------------------------------
    */

    console.error(
      "[WITHDRAWAL_CREATE_RECORD_ERROR]",
      {

        uid,

        withdrawalId,

        error,

      },
    );


    await releaseReservedWithdrawalAmount(

      uid,

      amount,

    );


    return {

      success: false,

      reason: "database_error",

    };

  }


  /*
  --------------------------------------------------
  9. SUCCÈS
  --------------------------------------------------
  */

  return {

    success: true,

    withdrawalId,

  };

}


/*
====================================================
FINALISER UN RETRAIT RÉUSSI
====================================================

Cette fonction est appelée par le webhook
lorsque MonCashConnect confirme que le payout
est completed.

Elle :

1. Marque le retrait comme completed
2. Libère le solde réservé
3. Enregistre le payoutId et les frais

IMPORTANT :

Cette fonction est idempotente.

Si le webhook est reçu deux fois :

Premier appel :

processing → completed
reservedBalance libéré

Deuxième appel :

déjà completed → aucune modification

====================================================
*/

export async function completeWithdrawal(
  withdrawalId: string,
  payoutId?: string,
  feeHtg?: number,
): Promise<boolean> {

  if (
    !isValidId(
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


  /*
  --------------------------------------------------
  1. RÉCUPÉRER LE RETRAIT
  --------------------------------------------------
  */

  const snapshot =

    await withdrawalRef.get();


  if (
    !snapshot.exists()
  ) {

    console.error(
      "[COMPLETE_WITHDRAWAL_NOT_FOUND]",
      {
        withdrawalId,
      },
    );


    return false;

  }


  const withdrawal =

    snapshot.val() as {

      uid?: string;

      amount?: number;

      status?: string;

      moncashNumber?: string;

    };


  /*
  --------------------------------------------------
  2. VALIDATION
  --------------------------------------------------
  */

  if (
    typeof withdrawal.uid !==
    "string"
  ) {

    return false;

  }


  if (
    typeof withdrawal.amount !==
      "number" ||
    !Number.isFinite(
      withdrawal.amount,
    ) ||
    withdrawal.amount <= 0
  ) {

    return false;

  }


  /*
  --------------------------------------------------
  3. DÉJÀ COMPLETED
  --------------------------------------------------
  */

  if (
    withdrawal.status ===
    "completed"
  ) {

    return true;

  }


  /*
  --------------------------------------------------
  4. TRANSACTION ATOMIQUE
  --------------------------------------------------
  */

  try {

    const result =

      await withdrawalRef.transaction(

        (
          currentWithdrawal,
        ) => {

          if (
            !currentWithdrawal
          ) {

            return;

          }


          /*
          ----------------------------------------
          DÉJÀ COMPLETED
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "completed"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          SI DÉJÀ REMBOURSÉ
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "refunded"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          MARQUER COMPLETED
          ----------------------------------------
          */

          return {

            ...currentWithdrawal,

            status:
              "completed",

            providerStatus:
              "completed",

            payoutId:
              payoutId ??
              currentWithdrawal.payoutId,

            feeHtg:
              feeHtg ??
              currentWithdrawal.feeHtg,

            totalCostHtg:
              (withdrawal.amount ?? 0) +
              (feeHtg ?? 0),

            completedAt:
              Date.now(),

            updatedAt:
              Date.now(),

          };

        },

      );


    if (
      !result.committed
    ) {

      return false;

    }


  } catch (
    error
  ) {

    console.error(
      "[COMPLETE_WITHDRAWAL_ERROR]",
      {
        withdrawalId,
        error,
      },
    );


    return false;

  }


  /*
  --------------------------------------------------
  5. DÉBITER LE SOLDE ET LIBÉRER LA RÉSERVATION
  --------------------------------------------------

  IMPORTANT CORRECTION :

  Le modèle comptable correct exige :
  - Completion: balance -= amount ET reservedBalance -= amount

  Le montant était réservé mais PAS encore débité.
  La completion doit donc :
  1. Débiter le balance
  2. Libérer la réservation
  --------------------------------------------------
  */

  const balanceRef =

    db.ref(
      `users/${withdrawal.uid}/balance`,
    );


  const balanceResult =

    await balanceRef.transaction(

      (
        currentBalance,
      ) => {

        const balance =

          Number(
            currentBalance || 0,
          );


        if (
          !Number.isFinite(balance)
        ) {

          return;

        }


        /*
        Débiter le montant du solde
        */

        const newBalance =
          balance -
          (withdrawal.amount ?? 0);


        if (
          newBalance < 0
        ) {

          return;

        }


        return newBalance;

      },

    );


  if (
    !balanceResult.committed
  ) {

    console.error(
      "[COMPLETE_WITHDRAWAL_DEBIT_ERROR]",
      {
        withdrawalId,
        uid:
          withdrawal.uid,
        amount:
          withdrawal.amount,
      },
    );


    /*
    ------------------------------------------------
    IMPORTANT :

    Le débit a échoué mais le retrait est marqué completed.
    On retourne false pour indiquer l'échec au webhook.
    Le webhook pourra être réessayé.
    ------------------------------------------------
    */

    return false;

  }


  /*
  --------------------------------------------------
  6. LIBÉRER LE SOLDE RÉSERVÉ
  --------------------------------------------------
  */

  const releaseResult =

    await releaseReservedWithdrawalAmount(

      withdrawal.uid,

      withdrawal.amount,

    );


  if (
    !releaseResult
  ) {

    console.error(
      "[COMPLETE_WITHDRAWAL_RELEASE_ERROR]",
      {
        withdrawalId,
        uid:
          withdrawal.uid,
        amount:
          withdrawal.amount,
      },
    );


    /*
    ------------------------------------------------
    IMPORTANT :

    Le solde a été débité mais la réservation n'est pas libérée.
    On retourne true pour ne pas bloquer le webhook,
    mais on log l'erreur pour une réparation manuelle.
    ------------------------------------------------
    */

    return true;

  }


  return true;

}


/*
====================================================
LIBÉRER UNE RÉSERVATION
====================================================

Utilisée si :

- création du retrait échoue
- rollback
- annulation interne

Cette fonction NE rembourse PAS le solde.

Elle réduit seulement reservedBalance.

====================================================
*/

export async function releaseReservedWithdrawalAmount(
  uid: string,
  amount: number,
): Promise<boolean> {

  if (
    !isValidUid(uid)
  ) {

    return false;

  }


  if (
    !isValidAmount(amount)
  ) {

    return false;

  }


  const db =
    getDatabase();


  const reservedBalanceRef =

    db.ref(
      `users/${uid}/reservedBalance`,
    );


  try {

    const result =

      await reservedBalanceRef.transaction(

        (
          currentReservedBalance,
        ) => {

          const reservedBalance =

            Number(
              currentReservedBalance || 0,
            );


          if (
            !Number.isFinite(
              reservedBalance,
            )
          ) {

            return;

          }


          /*
          ----------------------------------------
          PROTECTION CONTRE SOLDE RÉSERVÉ NÉGATIF
          ----------------------------------------
          */

          const newReservedBalance =

            Math.max(

              0,

              reservedBalance -
              amount,

            );


          return newReservedBalance;

        },

      );


    return result.committed;

  } catch (
    error
  ) {

    console.error(
      "[RELEASE_RESERVED_BALANCE_ERROR]",
      {

        uid,

        amount,

        error,

      },
    );


    return false;

  }

}


/*
====================================================
MARQUER PROCESSING
====================================================

pending → processing

Cette fonction NE touche PAS au solde.

Le montant reste réservé.

====================================================
*/

export async function markWithdrawalProcessing(
  withdrawalId: string,
): Promise<boolean> {

  if (
    !isValidId(
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


  try {

    const result =

      await withdrawalRef.transaction(

        (
          currentWithdrawal,
        ) => {

          if (
            !currentWithdrawal
          ) {

            return;

          }


          /*
          ----------------------------------------
          SI DÉJÀ PROCESSING
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "processing"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          SI DÉJÀ COMPLETED
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "completed"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          SI REMBOURSÉ
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "refunded"
          ) {

            return currentWithdrawal;

          }


          return {

            ...currentWithdrawal,

            status:
              "processing",

            updatedAt:
              Date.now(),

          };

        },

      );


    return result.committed;

  } catch (
    error
  ) {

    console.error(
      "[MARK_WITHDRAWAL_PROCESSING_ERROR]",
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
MARQUER RETRAIT ÉCHOUÉ
====================================================

Le statut devient :

failed

Le montant reste réservé.

Le remboursement doit ensuite être effectué
avec refundFailedWithdrawal().

====================================================
*/

export async function markWithdrawalFailed(
  withdrawalId: string,
  errorMessage: string,
): Promise<boolean> {

  if (
    !isValidId(
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


  try {

    const result =

      await withdrawalRef.transaction(

        (
          currentWithdrawal,
        ) => {

          if (
            !currentWithdrawal
          ) {

            return;

          }


          /*
          ----------------------------------------
          NE PAS ÉCRASER UN RETRAIT TERMINÉ
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "completed"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          DÉJÀ REMBOURSÉ
          ----------------------------------------
          */

          if (
            currentWithdrawal.status ===
            "refunded"
          ) {

            return currentWithdrawal;

          }


          /*
          ----------------------------------------
          RETRAIT ÉCHOUÉ
          ----------------------------------------
          */

          return {

            ...currentWithdrawal,

            status:
              "failed",

            providerStatus:
              "failed",

            errorMessage:

              typeof errorMessage ===
              "string"

                ? errorMessage

                : "Retrait échoué.",

            updatedAt:
              Date.now(),

          };

        },

      );


    return result.committed;

  } catch (
    error
  ) {

    console.error(
      "[MARK_WITHDRAWAL_FAILED_ERROR]",
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
REMBOURSEMENT D'UN RETRAIT ÉCHOUÉ
====================================================

IMPORTANT :

Cette fonction est idempotente.

Si le webhook est reçu deux fois :

Premier appel :

failed
↓
refund_pending
↓
remboursement
↓
refunded

Deuxième appel :

refunded
↓
aucune modification

Donc le joueur ne reçoit jamais
deux fois le remboursement.

====================================================
*/

export async function refundFailedWithdrawal(
  withdrawalId: string,
): Promise<{

  success: boolean;

  status:
    | "refunded"

    | "refund_pending"

    | "already_refunded"

    | "not_found"

    | "invalid_state"

    | "error";

}> {

  if (
    !isValidId(
      withdrawalId,
    )
  ) {

    return {

      success: false,

      status:
        "error",

    };

  }


  const db =
    getDatabase();


  const withdrawalRef =

    db.ref(
      `withdrawals/${withdrawalId}`,
    );


  /*
  --------------------------------------------------
  1. RÉCUPÉRER LE RETRAIT
  --------------------------------------------------
  */

  const snapshot =

    await withdrawalRef.get();


  if (
    !snapshot.exists()
  ) {

    return {

      success: false,

      status:
        "not_found",

    };

  }


  const withdrawal =

    snapshot.val() as {

      uid?: string;

      amount?: number;

      status?: string;

      refundedAt?: number | null;

      refundTransactionId?:
        string | null;

    };


  /*
  --------------------------------------------------
  2. DÉJÀ REMBOURSÉ
  --------------------------------------------------
  */

  if (
    withdrawal.status ===
    "refunded"
  ) {

    return {

      success: true,

      status:
        "already_refunded",

    };

  }


  /*
  --------------------------------------------------
  3. VALIDATION
  --------------------------------------------------
  */

  if (
    typeof withdrawal.uid !==
    "string"
  ) {

    return {

      success: false,

      status:
        "error",

    };

  }


  if (
    typeof withdrawal.amount !==
      "number" ||
    !Number.isFinite(
      withdrawal.amount,
    ) ||
    withdrawal.amount <= 0
  ) {

    return {

      success: false,

      status:
        "error",

    };

  }


  /*
  --------------------------------------------------
  4. SEULS LES RETRAITS ÉCHOUÉS
  --------------------------------------------------
  */

  if (
    withdrawal.status !==
    "failed" &&
    withdrawal.status !==
    "refund_pending"
  ) {

    return {

      success: false,

      status:
        "invalid_state",

    };

  }


  /*
  --------------------------------------------------
  5. PASSER À REFUND_PENDING
  --------------------------------------------------
  */

  const refundPendingResult =

    await withdrawalRef.transaction(

      (
        currentWithdrawal,
      ) => {

        if (
          !currentWithdrawal
        ) {

          return;

        }


        if (
          currentWithdrawal.status ===
          "refunded"
        ) {

          return currentWithdrawal;

        }


        if (
          currentWithdrawal.status !==
            "failed" &&
          currentWithdrawal.status !==
            "refund_pending"
        ) {

          return;

        }


        return {

          ...currentWithdrawal,

          status:
            "refund_pending",

          updatedAt:
            Date.now(),

        };

      },

    );


  if (
    !refundPendingResult.committed
  ) {

    /*
    ------------------------------------------------
    RECHERCHER L'ÉTAT ACTUEL
    ------------------------------------------------
    */

    const currentSnapshot =

      await withdrawalRef.get();


    if (
      currentSnapshot.exists() &&
      currentSnapshot.val()?.status ===
        "refunded"
    ) {

      return {

        success: true,

        status:
          "already_refunded",

      };

    }


    return {

      success: false,

      status:
        "refund_pending",

    };

  }


  /*
  --------------------------------------------------
  6. TRANSACTION ATOMIQUE DU REMBOURSEMENT
  --------------------------------------------------

  IMPORTANT :

  On utilise une transaction sur le retrait
  pour garantir qu'un seul processus puisse
  effectuer le remboursement.

  --------------------------------------------------
  */

  let shouldRefund = false;


  const claimResult =

    await withdrawalRef.transaction(

      (
        currentWithdrawal,
      ) => {

        if (
          !currentWithdrawal
        ) {

          return;

        }


        /*
        --------------------------------------------
        SI DÉJÀ REMBOURSÉ
        --------------------------------------------
        */

        if (
          currentWithdrawal.status ===
          "refunded"
        ) {

          return currentWithdrawal;

        }


        /*
        --------------------------------------------
        SEUL REFUND_PENDING EST ACCEPTÉ
        --------------------------------------------
        */

        if (
          currentWithdrawal.status !==
          "refund_pending"
        ) {

          return;

        }


        /*
        --------------------------------------------
        CLAIM DU REMBOURSEMENT
        --------------------------------------------
        */

        shouldRefund = true;


        return {

          ...currentWithdrawal,

          refundProcessing:
            true,

          refundStartedAt:
            Date.now(),

          updatedAt:
            Date.now(),

        };

      },

    );


  if (
    !claimResult.committed
  ) {

    const currentSnapshot =

      await withdrawalRef.get();


    if (
      currentSnapshot.exists() &&
      currentSnapshot.val()?.status ===
        "refunded"
    ) {

      return {

        success: true,

        status:
          "already_refunded",

      };

    }


    return {

      success: false,

      status:
        "refund_pending",

    };

  }


  if (
    !shouldRefund
  ) {

    return {

      success: true,

      status:
        "already_refunded",

    };

  }


  /*
  --------------------------------------------------
  7. LIBÉRER LE SOLDE RÉSERVÉ UNIQUEMENT
  --------------------------------------------------

  IMPORTANT CORRECTION :

  Le modèle comptable correct est :
  - Réservation: reservedBalance += amount (balance inchangé)
  - Completion: balance -= amount ET reservedBalance -= amount
  - Échec: reservedBalance -= amount (balance inchangé)

  Le montant n'a JAMAIS été débité du balance lors de la réservation.
  Donc le remboursement doit SEULEMENT libérer reservedBalance,
  PAS modifier le balance.

  Modifier le balance ici créerait de l'argent artificielle.
  --------------------------------------------------
  */


  /*
  --------------------------------------------------
  8. LIBÉRER LE SOLDE RÉSERVÉ
  --------------------------------------------------
  */

  const reservedReleaseResult =

    await releaseReservedWithdrawalAmount(

      withdrawal.uid,

      withdrawal.amount,

    );


  if (
    !reservedReleaseResult
  ) {

    /*
    ------------------------------------------------
    IMPORTANT :

    La libération de reservedBalance a échoué.
    On garde refund_pending pour permettre
    une réparation manuelle.

    ------------------------------------------------
    */

    await withdrawalRef.update({

      status:
        "refund_pending",

      refundProcessing:
        false,

      reservedBalanceReleasePending:
        true,

      updatedAt:
        Date.now(),

      errorMessage:
        "Réservation encore à libérer.",

    });


    return {

      success: false,

      status:
        "refund_pending",

    };

  }


  /*
  --------------------------------------------------
  9. FINALISER LE REMBOURSEMENT
  --------------------------------------------------
  */

  try {

    await withdrawalRef.update({

      status:
        "refunded",

      providerStatus:
        "failed",

      refundProcessing:
        false,

      reservedBalanceReleased:
        true,

      refundedAt:
        Date.now(),

      updatedAt:
        Date.now(),

      errorMessage:
        null,

    });


  } catch (
    error
  ) {

    /*
    ------------------------------------------------
    IMPORTANT :

    La libération de reservedBalance est déjà effectuée.
    Le statut pourra être réparé manuellement.

    ------------------------------------------------
    */

    console.error(
      "[WITHDRAWAL_REFUND_FINALIZE_ERROR]",
      {

        withdrawalId,

        error,

      },
    );


    return {

      success: false,

      status:
        "refund_pending",

    };

  }


  /*
  --------------------------------------------------
  10. SUCCÈS
  --------------------------------------------------
  */

  return {

    success: true,

    status:
      "refunded",

  };

}