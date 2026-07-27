/*
====================================================
src/lib/withdrawals/security.ts
====================================================

SÉCURITÉ DES RETRAITS

IMPORTANT :

- Ce fichier est exécuté côté serveur uniquement.
- Le frontend ne peut jamais décider du montant réellement
  retirable.
- Le frontend ne peut jamais modifier le solde.
- Le frontend ne peut jamais contourner l'obligation de mise.
- Toutes les valeurs importantes sont relues depuis Firebase
  côté serveur.

RÈGLE DE RETRAIT :

Exemple :

Dépôt initial :
100 HTG

Capital de dépôt :
100 HTG

Objectif avant retrait :
100 × 2 = 200 HTG

Le joueur peut jouer avec des mises libres :

10 HTG
20 HTG
30 HTG
40 HTG
50 HTG
etc.

La mise minimale est déterminée par le système de jeu.

Les mises sont cumulées dans :

users/{uid}/withdrawalStats/totalWagered

Le retrait devient autorisé lorsque :

totalWagered >= depositCapital × 2

IMPORTANT :

Le joueur peut avoir gagné plus que son capital.

Exemple :

Dépôt :
100 HTG

Mises cumulées :
200 HTG

Solde actuel :
350 HTG

Retrait demandé :
350 HTG

Le retrait est autorisé.

Le joueur reçoit exactement :

350 HTG

Les frais MonCashConnect sont prélevés en plus
sur le solde du compte marchand MonCashConnect.
====================================================
*/

import {
  adminDB,
} from "@/lib/firebaseAdmin";


/*
====================================================
CONSTANTES
====================================================
*/


/*
----------------------------------------------------
RETRAIT MINIMUM
----------------------------------------------------

MonCashConnect :

Minimum de retrait :
100 HTG
----------------------------------------------------
*/

export const MIN_WITHDRAWAL_AMOUNT =
  100;


/*
----------------------------------------------------
RETRAIT MAXIMUM

Cette limite est une limite interne de sécurité.

Le montant maximal autorisé par MonCashConnect
doit également être respecté.
----------------------------------------------------
*/

export const MAX_WITHDRAWAL_AMOUNT =
  100000;


/*
----------------------------------------------------
MULTIPLICATEUR DE MISE

Le joueur doit avoir misé :

capital de dépôt × 2

avant de pouvoir retirer.

ATTENTION :

Ce n'est PAS :

dépôt × 2 = montant obligatoire à miser
sur une seule partie.

C'est le total cumulé des mises valides.
----------------------------------------------------
*/

export const WITHDRAWAL_TURNOVER_MULTIPLIER =
  2;


/*
====================================================
TYPES
====================================================
*/


export type WithdrawalSecurityResult = {

  allowed:
    boolean;

  reason?:
    string;

  code?:
    string;

  uid?:
    string;

  balance?:
    number;

  amount?:
    number;

  totalDeposited?:
    number;

  depositCapital?:
    number;

  totalWagered?:
    number;

  turnoverRequired?:
    number;

  turnoverRemaining?:
    number;

};


/*
====================================================
UTILITAIRE

Convertit une valeur en nombre sûr.
====================================================
*/


function safeNumber(
  value: unknown
): number {

  const numberValue =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numberValue
    )
  ) {

    return 0;

  }


  return numberValue;

}


/*
====================================================
RÉCUPÉRER LES INFORMATIONS FINANCIÈRES
DE L'UTILISATEUR

IMPORTANT :

Toutes les données sont récupérées côté serveur.

Le client ne peut pas envoyer :

balance
totalDeposited
totalWagered

pour les faire accepter.

Ces données viennent directement de Firebase Admin.
====================================================
*/


async function getUserFinancialData(
  uid: string
) {

  const userRef =
    adminDB.ref(
      `users/${uid}`
    );


  const snapshot =
    await userRef.once(
      "value"
    );


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const userData =
    snapshot.val();


  /*
  ==================================================
  SOLDE ACTUEL
  ==================================================
  */

  const balance =
    safeNumber(
      userData.balance
    );


  /*
  ==================================================
  TOTAL DES DÉPÔTS
  ==================================================

  On récupère uniquement les dépôts terminés
  appartenant à cet utilisateur.

  Le montant utilisé pour la règle de mise
  est le capital de dépôt réellement crédité.
  ==================================================
  */

  const depositsSnapshot =
    await adminDB
      .ref(
        "deposits"
      )
      .orderByChild(
        "uid"
      )
      .equalTo(
        uid
      )
      .once(
        "value"
      );


  let totalDeposited =
    0;


  if (
    depositsSnapshot.exists()
  ) {

    const deposits =
      depositsSnapshot.val();


    for (
      const depositId of Object.keys(
        deposits
      )
    ) {

      const deposit =
        deposits[
          depositId
        ];


      /*
      ----------------------------------------------
      SEULS LES DÉPÔTS COMPLÉTÉS COMPTENT
      ----------------------------------------------
      */

      if (
        deposit?.status !==
        "completed"
      ) {

        continue;

      }


      /*
      ----------------------------------------------
      DEVise
      ----------------------------------------------
      */

      if (
        deposit?.currency &&
        deposit.currency !==
          "HTG"
      ) {

        continue;

      }


      const depositAmount =
        safeNumber(
          deposit.amount
        );


      if (
        depositAmount <=
        0
      ) {

        continue;

      }


      totalDeposited +=
        depositAmount;

    }

  }


  /*
  ==================================================
  CAPITAL DE DÉPÔT
  ==================================================

  Pour cette logique, le capital de dépôt est
  la somme des dépôts complétés.

  Exemple :

  Dépôt 100 HTG
  Dépôt 200 HTG

  Capital de dépôt :
  300 HTG

  Objectif de mise :
  300 × 2 = 600 HTG
  ==================================================
  */

  const depositCapital =
    totalDeposited;


  /*
  ==================================================
  TOTAL DES MISES
  ==================================================

  Cette valeur doit être alimentée par le serveur
  après chaque mise valide.

  Le frontend ne doit jamais écrire directement
  cette valeur.
  ==================================================
  */

  const totalWagered =
    safeNumber(
      userData
        ?.withdrawalStats
        ?.totalWagered
    );


  /*
  ==================================================
  OBJECTIF DE MISE
  ==================================================
  */

  const turnoverRequired =
    depositCapital *
    WITHDRAWAL_TURNOVER_MULTIPLIER;


  /*
  ==================================================
  MISE RESTANTE
  ==================================================
  */

  const turnoverRemaining =
    Math.max(
      0,
      turnoverRequired -
      totalWagered
    );


  return {

    balance,

    totalDeposited,

    depositCapital,

    totalWagered,

    turnoverRequired,

    turnoverRemaining,

  };

}


/*
====================================================
VALIDER LA SÉCURITÉ D'UN RETRAIT

Cette fonction ne retire PAS l'argent.

Elle décide seulement si le retrait peut
être autorisé.

La création réelle du retrait doit ensuite être
effectuée par atomic.ts / service.ts.
====================================================
*/


export async function validateWithdrawalSecurity(
  uid: string,
  requestedAmount: number
): Promise<WithdrawalSecurityResult> {


  /*
  ==================================================
  1. VALIDATION UID
  ==================================================
  */

  if (
    !uid ||
    typeof uid !==
      "string"
  ) {

    return {

      allowed:
        false,

      code:
        "INVALID_UID",

      reason:
        "Utilisateur invalide.",

    };

  }


  /*
  ==================================================
  2. NETTOYER UID
  ==================================================
  */

  const cleanUid =
    uid.trim();


  if (
    !cleanUid
  ) {

    return {

      allowed:
        false,

      code:
        "INVALID_UID",

      reason:
        "Utilisateur invalide.",

    };

  }


  /*
  ==================================================
  3. VALIDATION MONTANT
  ==================================================
  */

  const amount =
    Number(
      requestedAmount
    );


  if (
    !Number.isFinite(
      amount
    )
  ) {

    return {

      allowed:
        false,

      code:
        "INVALID_AMOUNT",

      reason:
        "Montant de retrait invalide.",

    };

  }


  /*
  ==================================================
  4. ENTIER HTG UNIQUEMENT
  ==================================================
  */

  if (
    !Number.isInteger(
      amount
    )
  ) {

    return {

      allowed:
        false,

      code:
        "AMOUNT_NOT_INTEGER",

      reason:
        "Le montant doit être un nombre entier en HTG.",

    };

  }


  /*
  ==================================================
  5. MINIMUM RETRAIT
  ==================================================
  */

  if (
    amount <
    MIN_WITHDRAWAL_AMOUNT
  ) {

    return {

      allowed:
        false,

      code:
        "MINIMUM_WITHDRAWAL",

      reason:
        `Le retrait minimum est de ${MIN_WITHDRAWAL_AMOUNT} HTG.`,

      amount,

    };

  }


  /*
  ==================================================
  6. MAXIMUM RETRAIT
  ==================================================
  */

  if (
    amount >
    MAX_WITHDRAWAL_AMOUNT
  ) {

    return {

      allowed:
        false,

      code:
        "MAXIMUM_WITHDRAWAL",

      reason:
        `Le retrait maximum est de ${MAX_WITHDRAWAL_AMOUNT.toLocaleString(
          "fr-FR"
        )} HTG.`,

      amount,

    };

  }


  /*
  ==================================================
  7. RÉCUPÉRER DONNÉES FINANCIÈRES SERVEUR
  ==================================================
  */

  let financialData;


  try {

    financialData =
      await getUserFinancialData(
        cleanUid
      );

  } catch (
    error
  ) {

    console.error(
      "[WITHDRAW SECURITY] Erreur lecture données financières :",
      error
    );


    return {

      allowed:
        false,

      code:
        "FINANCIAL_DATA_ERROR",

      reason:
        "Impossible de vérifier les informations financières.",

    };

  }


  /*
  ==================================================
  8. UTILISATEUR INTROUVABLE
  ==================================================
  */

  if (
    !financialData
  ) {

    return {

      allowed:
        false,

      code:
        "USER_NOT_FOUND",

      reason:
        "Compte utilisateur introuvable.",

    };

  }


  const {

    balance,

    totalDeposited,

    depositCapital,

    totalWagered,

    turnoverRequired,

    turnoverRemaining,

  } =
    financialData;


  /*
  ==================================================
  9. VÉRIFIER SOLDE
  ==================================================
  */

  if (
    balance <
    0
  ) {

    console.error(
      "[WITHDRAW SECURITY] Solde négatif détecté.",
      {
        uid:
          cleanUid,

        balance,
      }
    );


    return {

      allowed:
        false,

      code:
        "NEGATIVE_BALANCE",

      reason:
        "Votre solde est invalide.",

      balance,

      amount,

    };

  }


  /*
  ==================================================
  10. VÉRIFIER SOLDE SUFFISANT
  ==================================================
  */

  if (
    amount >
    balance
  ) {

    return {

      allowed:
        false,

      code:
        "INSUFFICIENT_BALANCE",

      reason:
        "Votre solde disponible est insuffisant.",

      balance,

      amount,

    };

  }


  /*
  ==================================================
  11. VÉRIFIER CAPITAL DE DÉPÔT
  ==================================================

  Si l'utilisateur n'a jamais effectué de dépôt,
  il n'y a aucun capital de dépôt à débloquer.

  Cette règle peut être adaptée selon la politique
  de votre plateforme.
  ==================================================
  */

  if (
    depositCapital >
    0
  ) {

    /*
    ================================================
    12. VÉRIFIER OBLIGATION DE MISE
    ================================================
    */

    if (
      totalWagered <
      turnoverRequired
    ) {

      return {

        allowed:
          false,

        code:
          "TURNOVER_NOT_COMPLETED",

        reason:
          `Vous devez encore miser ${turnoverRemaining.toLocaleString(
            "fr-FR"
          )} HTG avant de pouvoir retirer.`,

        uid:
          cleanUid,

        balance,

        amount,

        totalDeposited,

        depositCapital,

        totalWagered,

        turnoverRequired,

        turnoverRemaining,

      };

    }

  }


  /*
  ==================================================
  13. RETRAIT AUTORISÉ
  ==================================================
  */

  return {

    allowed:
      true,

    code:
      "WITHDRAWAL_ALLOWED",

    reason:
      "Retrait autorisé.",

    uid:
      cleanUid,

    balance,

    amount,

    totalDeposited,

    depositCapital,

    totalWagered,

    turnoverRequired,

    turnoverRemaining:

      0,

  };

}


/*
====================================================
VÉRIFIER SI UN UTILISATEUR A UN RETRAIT EN COURS
====================================================

Protection supplémentaire.

Un joueur ne doit pas pouvoir créer plusieurs
retraits simultanés.

IMPORTANT :

Cette vérification seule ne suffit PAS à garantir
la sécurité contre les courses concurrentes.

Le verrouillage réel doit être effectué
atomiquement dans atomic.ts.

Cette fonction sert uniquement de contrôle
préliminaire.
====================================================
*/


export async function hasPendingWithdrawal(
  uid: string
): Promise<boolean> {


  if (
    !uid
  ) {

    return false;

  }


  const snapshot =
    await adminDB
      .ref(
        "withdrawals"
      )
      .orderByChild(
        "uid"
      )
      .equalTo(
        uid
      )
      .once(
        "value"
      );


  if (
    !snapshot.exists()
  ) {

    return false;

  }


  const withdrawals =
    snapshot.val();


  for (
    const withdrawalId of Object.keys(
      withdrawals
    )
  ) {

    const withdrawal =
      withdrawals[
        withdrawalId
      ];


    if (
      withdrawal?.status ===
        "pending" ||
      withdrawal?.status ===
        "queued" ||
      withdrawal?.status ===
        "processing"
    ) {

      return true;

    }

  }


  return false;

}


/*
====================================================
VALIDATION NUMÉRO MONCASH
====================================================

Format attendu :

509XXXXXXXX

Exemple :

50912345678

IMPORTANT :

Cette validation vérifie uniquement le format.

La vérification que le numéro appartient réellement
à un compte MonCash actif doit être faite par
MonCashConnect ou par le processus de payout.
====================================================
*/


export function validateMonCashNumber(
  phoneNumber: string
): {

  valid:
    boolean;

  normalized:
    string;

  reason?:
    string;

} {


  if (
    typeof phoneNumber !==
    "string"
  ) {

    return {

      valid:
        false,

      normalized:
        "",

      reason:
        "Numéro MonCash invalide.",

    };

  }


  /*
  ==================================================
  NETTOYAGE
  ==================================================
  */

  const normalized =
    phoneNumber
      .replace(
        /[\s\-().]/g,
        ""
      )
      .trim();


  /*
  ==================================================
  FORMAT HAÏTIEN
  ==================================================
  */

  /*
  Format haïtien attendu :

  509XXXXXXXX (11 chiffres)

  Le préfixe + est accepté pour compatibilité
  avec le frontend qui envoie +509XXXXXXXX
  */

  const normalizedWithoutPlus = normalized.startsWith("+")
    ? normalized.slice(1)
    : normalized;


  const haitianPhoneRegex =
    /^509\d{8}$/;


  if (
    !haitianPhoneRegex.test(
      normalizedWithoutPlus
    )
  ) {

    return {

      valid:
        false,

      normalized: normalizedWithoutPlus,

      reason:
        "Le numéro MonCash doit être au format 509XXXXXXXX.",

    };

  }


  /*
  ==================================================
  NUMÉRO VALIDE
  ==================================================
  */

  return {

    valid:
      true,

    normalized: normalizedWithoutPlus,

  };

}


/*
====================================================
PROTECTION CONTRE LES MONTANTS ANORMAUX
====================================================

Empêche les montants extrêmement grands ou
des valeurs inattendues d'atteindre la logique
financière.
====================================================
*/


export function isSafeWithdrawalAmount(
  amount: unknown
): boolean {


  const numericAmount =
    Number(
      amount
    );


  if (
    !Number.isFinite(
      numericAmount
    )
  ) {

    return false;

  }


  if (
    !Number.isInteger(
      numericAmount
    )
  ) {

    return false;

  }


  if (
    numericAmount <
    MIN_WITHDRAWAL_AMOUNT
  ) {

    return false;

  }


  if (
    numericAmount >
    MAX_WITHDRAWAL_AMOUNT
  ) {

    return false;

  }


  return true;

}