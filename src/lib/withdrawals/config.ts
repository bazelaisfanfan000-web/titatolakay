/*
====================================================
CONFIGURATION RETRAITS TITATO
====================================================
*/

export const WITHDRAWAL_CURRENCY =
  "HTG" as const;

export const WITHDRAWAL_PROVIDER =
  "moncashconnect" as const;


/*
====================================================
MONTANTS
====================================================
*/

export const MIN_WITHDRAWAL_AMOUNT =
  100;

export const MAX_WITHDRAWAL_AMOUNT =
  100000;


/*
====================================================
TURNOVER
====================================================
*/

export const DEPOSIT_TURNOVER_MULTIPLIER =
  2;


/*
====================================================
FRAIS MONCASHCONNECT
====================================================
*/

export const MONCASH_WITHDRAWAL_FEE_RATE =
  0.05;


/*
====================================================
STATUTS RETRAIT
====================================================
*/

export const WITHDRAWAL_STATUS = {

  PENDING:
    "pending",

  PROCESSING:
    "processing",

  COMPLETED:
    "completed",

  FAILED:
    "failed",

  CANCELLED:
    "cancelled",

} as const;


/*
====================================================
STATUTS ACTIFS
====================================================
*/

export const ACTIVE_WITHDRAWAL_STATUSES = [

  WITHDRAWAL_STATUS.PENDING,

  WITHDRAWAL_STATUS.PROCESSING,

] as const;


/*
====================================================
TIMEOUT RETRAIT
====================================================
*/

export const WITHDRAWAL_TIMEOUT_MS =
  30 *
  60 *
  1000;


/*
====================================================
TOLÉRANCE WEBHOOK
====================================================
*/

export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS =
  300;


/*
====================================================
RETRAITS ACTIFS MAXIMUM
====================================================
*/

export const MAX_ACTIVE_WITHDRAWALS_PER_USER =
  1;


/*
====================================================
PRÉFIXES
====================================================
*/

export const WITHDRAWAL_REFERENCE_PREFIX =
  "titato_withdrawal_";

export const WITHDRAWAL_IDEMPOTENCY_PREFIX =
  "withdrawal_";


/*
====================================================
CHEMINS FIREBASE
====================================================
*/

export const FIREBASE_WITHDRAWALS_PATH =
  "withdrawals";

export const FIREBASE_USERS_PATH =
  "users";

export const FIREBASE_WALLET_LEDGER_PATH =
  "walletLedger";

export const FIREBASE_WITHDRAWAL_LOCKS_PATH =
  "withdrawalLocks";


/*
====================================================
URL MONCASHCONNECT
====================================================
*/

export const MONCASH_PAY_BALANCE_URL =
  "https://api.moncashconnect.com/v1/pay-balance";

export const MONCASH_PAYOUT_CREATE_URL =
  "https://api.moncashconnect.com/v1/payout-create";


/*
====================================================
MÉTHODE HTTP
====================================================
*/

export const MONCASH_HTTP_METHOD =
  "POST" as const;


/*
====================================================
NUMÉRO MONCASH
====================================================

L'utilisateur saisit uniquement :

31114949

Le système ajoute automatiquement :

509

Résultat envoyé à MonCashConnect :

50931114949

Format final :
509 + 8 chiffres

====================================================
*/

export const MONCASH_PHONE_REGEX =
  /^509\d{8}$/;


/*
====================================================
NUMÉRO LOCAL MONCASH
====================================================

Format saisi par l'utilisateur :

31114949

====================================================
*/

export const MONCASH_LOCAL_PHONE_REGEX =
  /^\d{8}$/;


/*
====================================================
PRÉFIXE HAÏTI
====================================================
*/

export const HAITI_PHONE_PREFIX =
  "509";


/*
====================================================
NOMBRE DE CHIFFRES LOCAL
====================================================
*/

export const MONCASH_LOCAL_PHONE_LENGTH =
  8;


/*
====================================================
ARRONDI MONÉTAIRE
====================================================
*/

export const MONEY_DECIMAL_PLACES =
  0;