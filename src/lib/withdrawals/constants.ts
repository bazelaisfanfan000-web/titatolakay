/*
====================================================
CONFIGURATION RETRAITS TITATO
====================================================

Ce fichier contient les constantes de sécurité
du système de retrait.

IMPORTANT :

Les valeurs présentes ici sont utilisées
UNIQUEMENT côté serveur.

Le frontend ne doit jamais être considéré
comme une source fiable pour ces règles.

====================================================
*/


/*
====================================================
DEVISE
====================================================
*/

export const WITHDRAWAL_CURRENCY =
  "HTG" as const;


/*
====================================================
FOURNISSEUR DE PAIEMENT
====================================================
*/

export const WITHDRAWAL_PROVIDER =
  "moncashconnect" as const;


/*
====================================================
MONTANT MINIMUM DE RETRAIT
====================================================

Minimum de retrait :

100 HTG

====================================================
*/

export const MIN_WITHDRAWAL_AMOUNT =
  100;


/*
====================================================
MONTANT MAXIMUM DE RETRAIT
====================================================

Le payout MonCashConnect accepte au maximum
100 000 HTG par opération.

====================================================
*/

export const MAX_WITHDRAWAL_AMOUNT =
  100000;


/*
====================================================
MULTIPLICATEUR DE TURNOVER
====================================================

RÈGLE :

Dépôt × 2

Exemple :

Dépôt :
100 HTG

Turnover requis :

100 × 2 = 200 HTG

Le joueur doit donc générer au minimum
200 HTG de mises éligibles avant de pouvoir
retirer les fonds concernés par ce dépôt.

====================================================
*/

export const DEPOSIT_TURNOVER_MULTIPLIER =
  2;


/*
====================================================
FRAIS MONCASHCONNECT
====================================================

IMPORTANT :

Le joueur doit recevoir exactement le montant
qu'il demande.

Exemple :

Le joueur demande :
500 HTG

Le payout envoyé au joueur :
500 HTG

Les frais du fournisseur sont supportés
séparément par la plateforme.

Cette constante sert uniquement à calculer
le coût estimé côté plateforme.

====================================================
*/

export const MONCASH_WITHDRAWAL_FEE_RATE =
  0.05;


/*
====================================================
STATUTS DE RETRAIT
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
STATUTS AUTORISÉS POUR LE LOCK
====================================================

Un retrait ne peut bloquer des fonds que
lorsqu'il est dans un état actif.

====================================================
*/

export const ACTIVE_WITHDRAWAL_STATUSES = [

  WITHDRAWAL_STATUS.PENDING,

  WITHDRAWAL_STATUS.PROCESSING,

] as const;


/*
====================================================
DÉLAI MAXIMUM D'ATTENTE
====================================================

Protection contre les retraits bloqués
indéfiniment.

Le service pourra utiliser cette valeur
pour détecter un payout qui reste trop
longtemps dans un état intermédiaire.

30 minutes.

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

Protection anti-replay pour les webhooks
MonCashConnect signés.

Le timestamp du webhook ne doit pas être
trop ancien.

5 minutes.

====================================================
*/

export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS =
  300;


/*
====================================================
NOMBRE MAXIMUM DE RETRAITS ACTIFS
====================================================

Un utilisateur ne peut avoir qu'un seul
retrait actif à la fois.

Cela évite :

- double retrait
- double verrouillage
- concurrence
- dépassement du solde
- attaques par requêtes simultanées

====================================================
*/

export const MAX_ACTIVE_WITHDRAWALS_PER_USER =
  1;


/*
====================================================
PRÉFIXE DES RÉFÉRENCES
====================================================
*/

export const WITHDRAWAL_REFERENCE_PREFIX =
  "titato_withdrawal_";


/*
====================================================
PRÉFIXE IDEMPOTENCE
====================================================
*/

export const WITHDRAWAL_IDEMPOTENCY_PREFIX =
  "withdrawal_";


/*
====================================================
CHEMIN FIREBASE
====================================================
*/

export const FIREBASE_WITHDRAWALS_PATH =
  "withdrawals";


/*
====================================================
CHEMIN WALLET UTILISATEUR
====================================================
*/

export const FIREBASE_USERS_PATH =
  "users";


/*
====================================================
CHEMIN LEDGER
====================================================
*/

export const FIREBASE_WALLET_LEDGER_PATH =
  "walletLedger";


/*
====================================================
CHEMIN LOCKS
====================================================
*/

export const FIREBASE_WITHDRAWAL_LOCKS_PATH =
  "withdrawalLocks";


/*
====================================================
URL API MONCASHCONNECT
====================================================
*/

export const MONCASH_PAY_BALANCE_URL =
  "https://api.moncashconnect.com/v1/pay-balance";


/*
====================================================
URL API PAYOUT
====================================================
*/

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
VALIDATION NUMÉRO MONCASH
====================================================

FORMAT SERVEUR ATTENDU :

509XXXXXXXX

Le numéro contient :

509 + 8 chiffres

Exemple utilisateur :

+509 31114949

Saisie dans le frontend :

31114949

Normalisation serveur :

50931114949

Regex :

^509\d{8}$

====================================================
*/

export const MONCASH_PHONE_REGEX =
  /^509\d{8}$/;


/*
====================================================
PRÉFIXE TÉLÉPHONE MONCASH
====================================================

Le frontend affiche :

+509

L'utilisateur saisit uniquement :

8 chiffres

Exemple :

31114949

Le serveur normalise ensuite vers :

50931114949

====================================================
*/

export const MONCASH_COUNTRY_CODE =
  "509" as const;


/*
====================================================
LONGUEUR DU NUMÉRO SAISI PAR L'UTILISATEUR
====================================================

L'utilisateur saisit uniquement les 8 chiffres
après le préfixe +509.

Exemple :

31114949

====================================================
*/

export const MONCASH_LOCAL_PHONE_LENGTH =
  8;


/*
====================================================
LONGUEUR DU NUMÉRO COMPLET
====================================================

509 + 8 chiffres

Exemple :

50931114949

====================================================
*/

export const MONCASH_FULL_PHONE_LENGTH =
  11;


/*
====================================================
ARRONDI MONÉTAIRE
====================================================

Les montants HTG doivent rester des nombres
entiers.

Aucun montant décimal n'est accepté.

====================================================
*/

export const MONEY_DECIMAL_PLACES =
  0;


/*
====================================================
RÈGLE IMPORTANTE
====================================================

NE PAS MODIFIER LE SOLDE DIRECTEMENT
DANS LE FRONTEND.

Le frontend demande uniquement :

"Je veux retirer X HTG."

Le serveur vérifie :

1. Firebase Auth
2. UID réel
3. montant minimum
4. montant maximum
5. numéro MonCash
6. solde disponible
7. fonds verrouillés
8. turnover ×2
9. retrait actif
10. plafond MonCashConnect
11. idempotence
12. transaction atomique

Puis seulement :

LOCK
↓
PAYOUT
↓
WEBHOOK
↓
COMPLETED ou FAILED
↓
UNLOCK / FINALIZE

====================================================
*/


/*
====================================================
RÉSUMÉ DU FORMAT MONCASH
====================================================

Frontend :

+509 | 31114949

Valeur saisie :

31114949

Valeur envoyée au serveur :

31114949

Valeur normalisée côté serveur :

50931114949

Valeur utilisée pour la validation :

50931114949

====================================================
*/