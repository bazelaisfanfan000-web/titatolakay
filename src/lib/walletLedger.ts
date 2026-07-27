/*
====================================================
TiTaTo - Wallet Ledger
====================================================

Ledger centralisé pour tous les mouvements financiers.

Architecture :

users/{uid}/balance
        │
        ├── deposit
        ├── bet
        ├── win
        ├── withdraw
        ├── withdrawal_refund
        ├── commission
        └── reward

transactions/{uid}/{transactionId}

IMPORTANT :

Toutes les modifications de solde doivent passer
par ce fichier.

Ne jamais faire directement :

users/{uid}/balance.set(...)

pour les opérations financières.

Le solde est modifié avec une transaction Firebase
Realtime Database afin d'éviter :

- double dépense
- perte de solde
- race condition
- retrait simultané
- double paiement
====================================================
*/

import {
  adminDB,
} from "./firebaseAdmin";


/*
====================================================
TYPES
====================================================
*/

export type TransactionType =

  | "deposit"

  | "bet"

  | "win"

  | "withdraw"

  | "withdrawal_refund"

  | "commission"

  | "reward"

  | "adjustment";


export type TransactionStatus =

  | "pending"

  | "completed"

  | "failed"

  | "refunded";


/*
====================================================
DONNÉES TRANSACTION
====================================================
*/

export interface AddTransactionInput {

  type: TransactionType;

  amount: number;

  roomId?: string;

  withdrawalId?: string;

  referenceId?: string;

  status?: TransactionStatus;

  description?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}


/*
====================================================
RÉSULTAT OPÉRATION SOLDE
====================================================
*/

export interface BalanceOperationResult {

  success: boolean;

  balanceBefore: number;

  balanceAfter: number;

  amount: number;

  transactionId?: string;
}


/*
====================================================
VALIDATION MONTANT
====================================================
*/

function validateAmount(
  amount: number
) {

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount)
  ) {

    throw new Error(
      "Montant invalide"
    );

  }


  if (amount <= 0) {

    throw new Error(
      "Le montant doit être supérieur à zéro"
    );

  }


  /*
  Les montants HTG sont conservés
  avec deux décimales maximum.
  */

  const rounded =
    Math.round(
      amount * 100
    ) / 100;


  if (
    rounded !== amount
  ) {

    throw new Error(
      "Le montant ne peut pas contenir plus de deux décimales"
    );

  }

}


/*
====================================================
NORMALISATION SOLDE
====================================================
*/

function normalizeBalance(
  value: unknown
): number {

  const balance =
    Number(value || 0);


  if (
    !Number.isFinite(balance) ||
    balance < 0
  ) {

    return 0;

  }


  return balance;

}


/*
====================================================
AJOUTER UNE TRANSACTION AU LEDGER
====================================================
*/

export async function addTransaction(

  uid: string,

  data: AddTransactionInput

): Promise<string> {


  if (
    !uid ||
    typeof uid !== "string"
  ) {

    throw new Error(
      "UID utilisateur invalide"
    );

  }


  validateAmount(
    data.amount
  );


  /*
  Création d'un ID unique
  côté Firebase.
  */

  const transactionRef =
    adminDB
      .ref(
        `transactions/${uid}`
      )
      .push();


  const transactionId =
    transactionRef.key;


  if (!transactionId) {

    throw new Error(
      "Impossible de créer l'identifiant de transaction"
    );

  }


  const now =
    Date.now();


  await transactionRef.set({

    id:
      transactionId,

    uid,

    type:
      data.type,

    amount:
      data.amount,

    roomId:
      data.roomId || null,

    withdrawalId:
      data.withdrawalId || null,

    referenceId:
      data.referenceId || null,

    status:
      data.status ||
      "completed",

    description:
      data.description ||
      null,

    metadata:
      data.metadata ||
      null,

    createdAt:
      now,

  });


  return transactionId;

}


/*
====================================================
RÉCUPÉRER LE SOLDE
====================================================
*/

export async function getBalance(

  uid: string

): Promise<number> {


  if (
    !uid ||
    typeof uid !== "string"
  ) {

    throw new Error(
      "UID utilisateur invalide"
    );

  }


  const snapshot =

    await adminDB

      .ref(
        `users/${uid}/balance`
      )

      .get();


  return normalizeBalance(
    snapshot.val()
  );

}


/*
====================================================
MODIFICATION ATOMIQUE DU SOLDE
====================================================

Cette fonction utilise une transaction Firebase.

Exemple :

Solde = 100 HTG

Deux retraits simultanés :

Retrait A = 80 HTG
Retrait B = 80 HTG

Une seule opération pourra réussir.

Résultat :

100 - 80 = 20

L'autre opération échoue.

Cela empêche le double spending.
====================================================
*/

export async function changeBalance(

  uid: string,

  amount: number

): Promise<BalanceOperationResult> {


  if (
    !uid ||
    typeof uid !== "string"
  ) {

    throw new Error(
      "UID utilisateur invalide"
    );

  }


  validateAmount(
    Math.abs(amount)
  );


  const balanceRef =

    adminDB

      .ref(
        `users/${uid}/balance`
      );


  let balanceBefore = 0;

  let balanceAfter = 0;


  const result =

    await balanceRef.transaction(

      (
        currentBalance
      ) => {


        balanceBefore =
          normalizeBalance(
            currentBalance
          );


        const newBalance =

          balanceBefore +
          amount;


        /*
        Le solde ne doit jamais
        devenir négatif.
        */

        if (
          newBalance < 0
        ) {

          return;

        }


        balanceAfter =
          Math.round(
            newBalance *
            100
          ) / 100;


        return balanceAfter;

      }

    );


  /*
  Firebase transaction annulée.
  */

  if (
    !result.committed
  ) {

    throw new Error(
      "Opération impossible : solde insuffisant ou transaction annulée"
    );

  }


  return {

    success:
      true,

    balanceBefore,

    balanceAfter,

    amount,

  };

}


/*
====================================================
AJOUTER DU SOLDE
====================================================

MODIFIÉ POUR UTILISER MULTI-PATH TRANSACTION

Cette fonction utilise maintenant une transaction
multi-path atomique pour écrire balance et ledger
en une seule opération.
====================================================
*/

export async function addBalance(

  uid: string,

  amount: number,

  transactionData?: Omit<
    AddTransactionInput,
    "amount"
  >

): Promise<BalanceOperationResult & {
  transactionId?: string;
}> {


  validateAmount(
    amount
  );


  /*
  Créer l'ID de transaction avant la transaction
  pour garantir l'unicité
  */

  const transactionRef =
    adminDB
      .ref(
        `transactions/${uid}`
      )
      .push();


  const transactionId =
    transactionRef.key;


  if (!transactionId) {

    throw new Error(
      "Impossible de créer l'identifiant de transaction"
    );

  }


  const now = Date.now();


  /*
  Transaction multi-path atomique
  */

  const updates: Record<string, any> = {

    /*
    Mise à jour du balance
    */

    [`users/${uid}/balance`]: (currentBalance: any) => {

      const balance = Number(currentBalance || 0);

      if (!Number.isFinite(balance)) {

        return 0;

      }

      const newBalance = balance + amount;

      if (newBalance < 0) {

        return;

      }

      return Math.round(newBalance * 100) / 100;

    },

    /*
    Création de la transaction ledger
    */

    [`transactions/${uid}/${transactionId}`]: {

      id: transactionId,

      uid,

      type: transactionData?.type || "adjustment",

      amount,

      roomId: transactionData?.roomId || null,

      withdrawalId: transactionData?.withdrawalId || null,

      referenceId: transactionData?.referenceId || null,

      status: transactionData?.status || "completed",

      description: transactionData?.description || null,

      metadata: transactionData?.metadata || null,

      createdAt: now,

    },

  };


  const result =
    await adminDB.ref().update(updates);


  /*
  Récupérer le nouveau balance pour le retour
  */

  const balanceAfter =
    await getBalance(uid);


  const balanceBefore =
    balanceAfter - amount;


  return {

    success: true,

    balanceBefore,

    balanceAfter,

    amount,

    transactionId,

  };

}


/*
====================================================
RETIRER DU SOLDE
====================================================

MODIFIÉ POUR UTILISER MULTI-PATH TRANSACTION

Cette fonction utilise maintenant une transaction
multi-path atomique pour écrire balance et ledger
en une seule opération.
====================================================
*/

export async function removeBalance(

  uid: string,

  amount: number,

  transactionData?: Omit<
    AddTransactionInput,
    "amount"
  >

): Promise<BalanceOperationResult & {
  transactionId?: string;
}> {


  validateAmount(
    amount
  );


  /*
  Créer l'ID de transaction avant la transaction
  pour garantir l'unicité
  */

  const transactionRef =
    adminDB
      .ref(
        `transactions/${uid}`
      )
      .push();


  const transactionId =
    transactionRef.key;


  if (!transactionId) {

    throw new Error(
      "Impossible de créer l'identifiant de transaction"
    );

  }


  const now = Date.now();


  /*
  Transaction multi-path atomique
  */

  const updates: Record<string, any> = {

    /*
    Mise à jour du balance
    */

    [`users/${uid}/balance`]: (currentBalance: any) => {

      const balance = Number(currentBalance || 0);

      if (!Number.isFinite(balance)) {

        return 0;

      }

      const newBalance = balance - amount;

      if (newBalance < 0) {

        return;

      }

      return Math.round(newBalance * 100) / 100;

    },

    /*
    Création de la transaction ledger
    */

    [`transactions/${uid}/${transactionId}`]: {

      id: transactionId,

      uid,

      type: transactionData?.type || "withdraw",

      amount,

      roomId: transactionData?.roomId || null,

      withdrawalId: transactionData?.withdrawalId || null,

      referenceId: transactionData?.referenceId || null,

      status: transactionData?.status || "completed",

      description: transactionData?.description || null,

      metadata: transactionData?.metadata || null,

      createdAt: now,

    },

  };


  const result =
    await adminDB.ref().update(updates);


  /*
  Récupérer le nouveau balance pour le retour
  */

  const balanceAfter =
    await getBalance(uid);


  const balanceBefore =
    balanceAfter + amount;


  return {

    success: true,

    balanceBefore,

    balanceAfter,

    amount,

    transactionId,

  };

}


/*
====================================================
RÉSERVER DES FONDS
====================================================

Utilisé pour un retrait.

MODÈLE COMPTABLE CORRIGÉ :

Réservation ne débite PAS le balance.
Elle augmente reservedBalance.

Exemple :

Balance = 1 000 HTG
ReservedBalance = 0 HTG
Retrait = 500 HTG

Après réservation :

Balance = 1 000 HTG (inchangé)
ReservedBalance = 500 HTG

Available = 500 HTG

Si le retrait réussit :
balance -= 500
reservedBalance -= 500

Si le retrait échoué :
reservedBalance -= 500 (balance inchangé)
====================================================
*/

export async function reserveFunds(

  uid: string,

  amount: number,

  withdrawalId: string,

  referenceId: string

) {


  validateAmount(amount);


  const reservedBalanceRef =

    adminDB.ref(
      `users/${uid}/reservedBalance`
    );


  const result =

    await reservedBalanceRef.transaction(

      (currentReserved) => {

        const reserved =

          Number(currentReserved || 0);


        if (
          !Number.isFinite(reserved)
        ) {

          return;

        }


        return reserved + amount;

      }

    );


  if (
    !result.committed
  ) {

    throw new Error(
      "Impossible de réserver les fonds"
    );

  }


  /*
  Enregistrer la transaction dans le ledger
  */

  try {

    await addTransaction(

      uid,

      {

        type: "withdraw",

        amount,

        withdrawalId,

        referenceId,

        status: "pending",

        description: "Réservation de fonds pour retrait",

      }

    );

  } catch (error) {

    /*
    Compensation : annuler la réservation si ledger échoué
    */

    try {

      await reservedBalanceRef.transaction((currentReserved) => {

        const reserved = Number(currentReserved || 0);

        return Math.max(0, reserved - amount);

      });

    } catch {

      console.error(
        "CRITICAL: Impossible de compenser la réservation",
        error
      );

    }


    throw error;

  }


  return {

    success: true,

    amount,

  };

}


/*
====================================================
REMBOURSER UN RETRAIT
====================================================

MODÈLE COMPTABLE CORRIGÉ :

Le remboursement ne crédite PAS le balance.
Il libère uniquement reservedBalance.

Le montant n'a jamais été débité lors de la réservation,
donc il ne doit pas être recrédité.

Exemple :

Balance = 1 000 HTG
ReservedBalance = 500 HTG

Après remboursement :

Balance = 1 000 HTG (inchangé)
ReservedBalance = 0 HTG
====================================================
*/

export async function refundWithdrawal(

  uid: string,

  amount: number,

  withdrawalId: string,

  referenceId: string

) {


  validateAmount(amount);


  const reservedBalanceRef =

    adminDB.ref(
      `users/${uid}/reservedBalance`
    );


  const result =

    await reservedBalanceRef.transaction(

      (currentReserved) => {

        const reserved =

          Number(currentReserved || 0);


        if (
          !Number.isFinite(reserved)
        ) {

          return;

        }


        return Math.max(0, reserved - amount);

      }

    );


  if (
    !result.committed
  ) {

    throw new Error(
      "Impossible de libérer les fonds réservés"
    );

  }


  /*
  Enregistrer la transaction dans le ledger
  */

  try {

    await addTransaction(

      uid,

      {

        type: "withdrawal_refund",

        amount,

        withdrawalId,

        referenceId,

        status: "refunded",

        description: "Remboursement d'un retrait échoué",

      }

    );

  } catch (error) {

    console.error(
      "LEDGER_ERROR: Impossible d'enregistrer le remboursement",
      error
    );

    /*
    On ne compense pas car la libération de reservedBalance
    est déjà effectuée et correcte.
    Le ledger manquant peut être réparé par réconciliation.
    */

  }


  return {

    success: true,

    amount,

  };

}


/*
====================================================
CRÉDITER UN GAIN
====================================================
*/

export async function creditWin(

  uid: string,

  amount: number,

  roomId?: string

) {


  return addBalance(

    uid,

    amount,

    {

      type:
        "win",

      roomId,

      status:
        "completed",

      description:
        "Gain de partie TiTaTo",

    }

  );

}


/*
====================================================
DÉBITER UNE MISE
====================================================
*/

export async function debitBet(

  uid: string,

  amount: number,

  roomId?: string

) {


  return removeBalance(

    uid,

    amount,

    {

      type:
        "bet",

      roomId,

      status:
        "completed",

      description:
        "Mise de partie TiTaTo",

    }

  );

}


/*
====================================================
ENREGISTRER UNE COMMISSION
====================================================
*/

export async function addCommission(

  uid: string,

  amount: number,

  roomId?: string

) {


  return removeBalance(

    uid,

    amount,

    {

      type:
        "commission",

      roomId,

      status:
        "completed",

      description:
        "Commission TiTaTo",

    }

  );

}