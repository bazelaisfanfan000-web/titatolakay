/*
====================================================
TiTaTo - Withdrawal Validation
====================================================

Ce fichier contient toutes les validations liées
aux demandes de retrait.

IMPORTANT :

- Ce fichier ne modifie jamais Firebase.
- Ce fichier ne contacte jamais MonCashConnect.
- Il valide uniquement les données.
- Les limites métier sont vérifiées côté serveur.
- Le solde réel doit toujours être vérifié côté serveur.
- Les limites quotidiennes doivent être calculées
  à partir des données serveur.
- Les transactions Firebase restent nécessaires
  pour empêcher les courses concurrentes.

====================================================
*/


import type {
  CreateWithdrawalInput,
} from "./types";


/*
====================================================
CONFIGURATION
====================================================
*/


/*
Montant minimum d'un retrait.

Exemple :

100 HTG minimum.
*/

export const MIN_WITHDRAWAL_AMOUNT =
  100;


/*
Montant maximum d'un seul retrait.

Exemple :

25 000 HTG maximum par demande.
*/

export const MAX_WITHDRAWAL_AMOUNT =
  25_000;


/*
Montant maximum total retirable
par utilisateur et par jour.

Exemple :

10 000
+ 5 000
+ 5 000

Total :
20 000 HTG
*/

export const DAILY_WITHDRAWAL_LIMIT =
  50_000;


/*
Nombre maximum de demandes
de retrait par utilisateur
et par jour.
*/

export const DAILY_WITHDRAWAL_COUNT_LIMIT =
  5;


/*
Nombre maximum de chiffres
autorisés pour un montant.

Exemple :

25 000
= 5 chiffres

50 000
= 5 chiffres

Le maximum actuel de 7 chiffres
permet jusqu'à 9 999 999,
mais MAX_WITHDRAWAL_AMOUNT reste
la limite réelle.
*/

export const MAX_AMOUNT_DIGITS =
  7;


/*
====================================================
TYPES
====================================================
*/


export interface WithdrawalValidationResult {

  /*
  true si les données sont valides.
  */

  valid: boolean;


  /*
  Message d'erreur.
  */

  error?: string;


  /*
  Données nettoyées.
  */

  data?: CreateWithdrawalInput;
}


export interface WithdrawalLimitValidationInput {

  /*
  Montant du nouveau retrait.
  */

  amount: number;


  /*
  Montant total déjà utilisé
  aujourd'hui.

  Cette valeur doit être calculée
  côté serveur.

  Elle doit inclure les retraits
  pertinents selon la politique
  métier de TiTaTo.
  */

  dailyWithdrawalAmount: number;


  /*
  Nombre de retraits déjà comptabilisés
  aujourd'hui.

  Cette valeur doit venir du serveur.
  */

  dailyWithdrawalCount: number;
}


export interface WithdrawalLimitValidationResult {

  /*
  true si toutes les limites
  sont respectées.
  */

  valid: boolean;


  /*
  Message d'erreur éventuel.
  */

  error?: string;
}


/*
====================================================
UTILITAIRES INTERNES
====================================================
*/


/*
Vérifie qu'une valeur est un nombre entier
valide et fini.
*/

function isPositiveInteger(
  value: unknown,
): value is number {

  return (

    typeof value ===
    "number"

    &&

    Number.isFinite(
      value,
    )

    &&

    Number.isInteger(
      value,
    )

    &&

    value > 0

  );
}


/*
====================================================
NORMALISATION DU NUMÉRO MONCASH
====================================================

Formats acceptés :

509XXXXXXXX

+509XXXXXXXX

509 XXXXXXXX

+509 XXXXXXXX

509-XXXXXXXX

+509-XXXXXXXX

(509) XXXXXXXX

Résultat :

509XXXXXXXX

Exemple :

+509 3700 0000

devient :

50937000000

====================================================
*/


export function normalizeMonCashNumber(
  value: string,
): string {

  /*
  Vérification du type.
  */

  if (
    typeof value !==
    "string"
  ) {

    return "";
  }


  /*
  Supprime les espaces,
  tirets, parenthèses
  et caractères non numériques.
  */

  const digits =
    value.replace(
      /\D/g,
      "",
    );


  /*
  Si le numéro contient déjà
  le préfixe international 509,
  on le conserve.

  La validation finale vérifiera
  qu'il contient exactement
  11 chiffres.
  */

  if (
    digits.startsWith(
      "509",
    )
  ) {

    return digits;
  }


  /*
  Si l'utilisateur fournit
  uniquement les 8 chiffres
  du numéro haïtien,
  on ajoute 509.
  */

  if (
    digits.length ===
    8
  ) {

    return `509${digits}`;
  }


  /*
  Numéro invalide.
  */

  return "";
}


/*
====================================================
VALIDATION DU NUMÉRO MONCASH
====================================================
*/


export function validateMonCashNumber(
  value: unknown,
): string | null {

  /*
  Le numéro doit être une chaîne.
  */

  if (
    typeof value !==
    "string"
  ) {

    return null;
  }


  /*
  Évite d'accepter une chaîne vide
  ou composée uniquement d'espaces.
  */

  if (
    value.trim().length ===
    0
  ) {

    return null;
  }


  /*
  Normalisation.
  */

  const normalized =
    normalizeMonCashNumber(
      value,
    );


  /*
  Format haïtien attendu :

  509
  +
  8 chiffres

  Total :

  11 chiffres

  Le préfixe + est accepté pour compatibilité
  avec le frontend qui envoie +509XXXXXXXX
  */

  const normalizedWithoutPlus = normalized.startsWith("+")
    ? normalized.slice(1)
    : normalized;


  if (
    !/^509\d{8}$/.test(
      normalizedWithoutPlus,
    )
  ) {

    return null;
  }


  /*
  Retourne uniquement
  la version normalisée sans le +
  */

  return normalizedWithoutPlus;
}


/*
====================================================
VALIDATION DU MONTANT
====================================================
*/


export function validateWithdrawalAmount(
  value: unknown,
): number | null {

  /*
  IMPORTANT :

  On exige un vrai nombre.

  Une chaîne comme :

  "1000"

  est refusée.

  Cela évite les conversions implicites
  inattendues provenant du frontend.
  */

  if (
    typeof value !==
    "number"
  ) {

    return null;
  }


  /*
  Refuse :

  NaN
  Infinity
  -Infinity
  */

  if (
    !Number.isFinite(
      value,
    )
  ) {

    return null;
  }


  /*
  Le montant doit être entier.

  Exemple refusé :

  100.50

  TiTaTo utilise des HTG entiers.
  */

  if (
    !Number.isInteger(
      value,
    )
  ) {

    return null;
  }


  /*
  Le montant doit être positif.
  */

  if (
    value <=
    0
  ) {

    return null;
  }


  /*
  Vérification du nombre
  maximum de chiffres.
  */

  if (
    String(
      value,
    ).length >
    MAX_AMOUNT_DIGITS
  ) {

    return null;
  }


  /*
  Montant minimum.
  */

  if (
    value <
    MIN_WITHDRAWAL_AMOUNT
  ) {

    return null;
  }


  /*
  Montant maximum.
  */

  if (
    value >
    MAX_WITHDRAWAL_AMOUNT
  ) {

    return null;
  }


  /*
  Montant valide.
  */

  return value;
}


/*
====================================================
VALIDATION COMPLÈTE DE LA DEMANDE
====================================================
*/


export function validateWithdrawalInput(
  input: unknown,
): WithdrawalValidationResult {

  /*
  Vérifie que l'entrée est bien
  un objet JSON.
  */

  if (
    typeof input !==
    "object"

    ||

    input === null

    ||

    Array.isArray(
      input,
    )
  ) {

    return {

      valid:
        false,

      error:
        "Données de retrait invalides.",
    };
  }


  /*
  Conversion sécurisée.

  Les données restent non fiables.
  */

  const data =
    input as Record<
      string,
      unknown
    >;


  /*
  --------------------------------------------------
  VALIDATION MONTANT
  --------------------------------------------------
  */

  const amount =
    validateWithdrawalAmount(
      data.amount,
    );


  if (
    amount ===
    null
  ) {

    return {

      valid:
        false,

      error:
        `Le montant doit être un nombre entier compris entre ${MIN_WITHDRAWAL_AMOUNT} et ${MAX_WITHDRAWAL_AMOUNT} HTG.`,
    };
  }


  /*
  --------------------------------------------------
  VALIDATION NUMÉRO MONCASH
  --------------------------------------------------
  */

  const moncashNumber =
    validateMonCashNumber(
      data.moncashNumber,
    );


  if (
    moncashNumber ===
    null
  ) {

    return {

      valid:
        false,

      error:
        "Le numéro MonCash est invalide.",
    };
  }


  /*
  --------------------------------------------------
  RETOUR DES DONNÉES NETTOYÉES
  --------------------------------------------------

  On retourne uniquement :

  amount
  moncashNumber

  Tous les autres champs envoyés
  par le frontend sont ignorés.

  Exemple :

  {
    amount: 1000,
    moncashNumber: "50937000000",
    uid: "FAKE_UID",
    status: "completed",
    balance: 999999
  }

  devient :

  {
    amount: 1000,
    moncashNumber: "50937000000"
  }

  --------------------------------------------------
  */

  return {

    valid:
      true,

    data: {

      amount,

      moncashNumber,

    },
  };
}


/*
====================================================
VALIDATION DES LIMITES QUOTIDIENNES
====================================================
*/


export function validateWithdrawalLimits(
  input: WithdrawalLimitValidationInput,
): WithdrawalLimitValidationResult {

  /*
  --------------------------------------------------
  VALIDATION DU MONTANT DEMANDÉ
  --------------------------------------------------
  */

  const amount =
    validateWithdrawalAmount(
      input.amount,
    );


  if (
    amount ===
    null
  ) {

    return {

      valid:
        false,

      error:
        `Le montant doit être un entier compris entre ${MIN_WITHDRAWAL_AMOUNT} et ${MAX_WITHDRAWAL_AMOUNT} HTG.`,
    };
  }


  /*
  --------------------------------------------------
  VALIDATION DU TOTAL QUOTIDIEN
  --------------------------------------------------
  */

  if (
    typeof input.dailyWithdrawalAmount !==
    "number"

    ||

    !Number.isFinite(
      input.dailyWithdrawalAmount,
    )

    ||

    !Number.isInteger(
      input.dailyWithdrawalAmount,
    )

    ||

    input.dailyWithdrawalAmount <
    0
  ) {

    return {

      valid:
        false,

      error:
        "Historique de retrait quotidien invalide.",
    };
  }


  /*
  --------------------------------------------------
  VALIDATION DU NOMBRE DE RETRAITS
  --------------------------------------------------
  */

  if (
    typeof input.dailyWithdrawalCount !==
    "number"

    ||

    !Number.isFinite(
      input.dailyWithdrawalCount,
    )

    ||

    !Number.isInteger(
      input.dailyWithdrawalCount,
    )

    ||

    input.dailyWithdrawalCount <
    0
  ) {

    return {

      valid:
        false,

      error:
        "Nombre de retraits quotidien invalide.",
    };
  }


  /*
  --------------------------------------------------
  LIMITE DU NOMBRE DE RETRAITS
  --------------------------------------------------
  */

  if (
    input.dailyWithdrawalCount >=
    DAILY_WITHDRAWAL_COUNT_LIMIT
  ) {

    return {

      valid:
        false,

      error:
        "Vous avez atteint votre limite quotidienne de retraits.",
    };
  }


  /*
  --------------------------------------------------
  CALCUL DU NOUVEAU TOTAL
  --------------------------------------------------
  */

  const newDailyTotal =
    input.dailyWithdrawalAmount +
    amount;


  /*
  Protection contre un éventuel
  dépassement numérique.
  */

  if (
    !Number.isSafeInteger(
      newDailyTotal,
    )
  ) {

    return {

      valid:
        false,

      error:
        "Le montant total des retraits est invalide.",
    };
  }


  /*
  --------------------------------------------------
  LIMITE QUOTIDIENNE DE MONTANT
  --------------------------------------------------
  */

  if (
    newDailyTotal >
    DAILY_WITHDRAWAL_LIMIT
  ) {

    const remainingAmount =
      Math.max(

        0,

        DAILY_WITHDRAWAL_LIMIT -
        input.dailyWithdrawalAmount,

      );


    return {

      valid:
        false,

      error:
        `Vous pouvez encore retirer ${remainingAmount} HTG aujourd'hui. La limite quotidienne est de ${DAILY_WITHDRAWAL_LIMIT} HTG.`,
    };
  }


  /*
  --------------------------------------------------
  SUCCÈS
  --------------------------------------------------
  */

  return {

    valid:
      true,
  };
}


/*
====================================================
VALIDATION D'UN RETRAIT AVANT MONCASHCONNECT
====================================================

Cette fonction effectue une dernière validation
des données avant l'envoi au provider.

IMPORTANT :

Cette fonction ne vérifie PAS :

- le solde Firebase ;
- le KYC ;
- le statut du compte ;
- les limites quotidiennes ;
- un retrait actif ;
- l'état du payout.

Ces vérifications appartiennent
au service côté serveur.

====================================================
*/


export function validateWithdrawalForProvider(
  amount: unknown,
  moncashNumber: unknown,
): WithdrawalValidationResult {

  return validateWithdrawalInput({

    amount,

    moncashNumber,

  });
}


/*
====================================================
VALIDATION DE LA LIMITE RESTANTE
====================================================

Utilitaire pratique pour le service.

Exemple :

Limite quotidienne :

50 000 HTG

Déjà utilisé :

30 000 HTG

Reste :

20 000 HTG

====================================================
*/


export function getRemainingDailyWithdrawalLimit(
  dailyWithdrawalAmount: number,
): number {

  /*
  Si la valeur est invalide,
  on ne retourne jamais une valeur
  négative ou incohérente.
  */

  if (
    typeof dailyWithdrawalAmount !==
    "number"

    ||

    !Number.isFinite(
      dailyWithdrawalAmount,
    )

    ||

    dailyWithdrawalAmount <
    0
  ) {

    return 0;
  }


  return Math.max(

    0,

    DAILY_WITHDRAWAL_LIMIT -
    dailyWithdrawalAmount,

  );
}


/*
====================================================
VALIDATION RAPIDE DU NOMBRE DE RETRAITS
====================================================
*/


export function canCreateAnotherWithdrawal(
  dailyWithdrawalCount: number,
): boolean {

  if (
    !Number.isInteger(
      dailyWithdrawalCount,
    )
  ) {

    return false;
  }


  if (
    dailyWithdrawalCount <
    0
  ) {

    return false;
  }


  return (
    dailyWithdrawalCount <
    DAILY_WITHDRAWAL_COUNT_LIMIT
  );
}


/*
====================================================
VALIDATION DU MONTANT RESTANT
====================================================

Retourne le montant maximum
qu'un utilisateur peut encore demander
aujourd'hui, en tenant compte :

1. de la limite quotidienne ;
2. du maximum par retrait.

====================================================
*/


export function getMaximumWithdrawalAvailableToday(
  dailyWithdrawalAmount: number,
): number {

  const remainingDailyLimit =
    getRemainingDailyWithdrawalLimit(
      dailyWithdrawalAmount,
    );


  return Math.min(

    MAX_WITHDRAWAL_AMOUNT,

    remainingDailyLimit,

  );
}


/*
====================================================
FIN DU FICHIER
====================================================
*/