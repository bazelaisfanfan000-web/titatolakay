/*
====================================================
TiTaTo - Withdrawal Types
====================================================

Types centraux du système de retrait.

FLOW NORMAL :

pending
   ↓
processing
   ↓
completed

FLOW ÉCHEC :

pending
   ↓
processing
   ↓
refund_pending
   ↓
refunded

IMPORTANT :

Un payout MonCashConnect accepté ou inconnu
ne doit jamais être remboursé automatiquement
uniquement à cause d'un timeout réseau.

Le webhook / système de récupération
reste la source finale de vérité.

====================================================
*/


/*
====================================================
STATUT D'UN RETRAIT
====================================================
*/

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refund_pending"
  | "refunded";


/*
====================================================
STATUT MONCASHCONNECT
====================================================
*/

export type MonCashPayoutStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";


/*
====================================================
ÉVÉNEMENTS WEBHOOK MONCASHCONNECT
====================================================
*/

export type MonCashPayoutEvent =
  | "payout.completed"
  | "payout.failed";


/*
====================================================
DEMANDE DE RETRAIT CLIENT
====================================================
*/

export interface CreateWithdrawalInput {

  /*
  Montant demandé par le joueur
  en HTG
  */

  amount: number;


  /*
  Numéro MonCash du destinataire
  */

  moncashNumber: string;
}


/*
====================================================
DONNÉES UTILISATEUR DU RETRAIT
====================================================
*/

export interface WithdrawalUser {

  /*
  UID Firebase
  */

  uid: string;


  /*
  Nom affiché du joueur
  */

  displayName?: string;


  /*
  Numéro de téléphone du compte
  */

  phoneNumber?: string;


  /*
  Numéro MonCash utilisé pour le retrait
  */

  moncashNumber: string;
}


/*
====================================================
ENREGISTREMENT D'UN RETRAIT
====================================================
*/

export interface Withdrawal {

  /*
  ID unique interne du retrait
  */

  id: string;


  /*
  UID Firebase du joueur
  */

  uid: string;


  /*
  Montant envoyé au joueur
  */

  amount: number;


  /*
  Frais MonCashConnect
  */

  feeHtg: number;


  /*
  Montant total débité côté système.

  Généralement :

  amount + feeHtg
  */

  totalCostHtg: number;


  /*
  Numéro MonCash du destinataire
  */

  moncashNumber: string;


  /*
  Référence unique envoyée à MonCashConnect.

  Cette référence doit rester identique
  pendant toute la durée du payout.
  */

  referenceId: string;


  /*
  ID du payout retourné par MonCashConnect
  */

  payoutId?: string;


  /*
  Statut interne TiTaTo
  */

  status: WithdrawalStatus;


  /*
  Statut retourné par MonCashConnect
  */

  providerStatus?: MonCashPayoutStatus;


  /*
  Message d'erreur éventuel
  */

  errorMessage?: string;


  /*
  Indique si le montant a été réservé
  sur le solde utilisateur.
  */

  fundsReserved: boolean;


  /*
  Indique si le remboursement financier
  a été complètement finalisé.
  */

  fundsRefunded: boolean;


  /*
  Indique si le crédit du remboursement
  a déjà été effectué sur le solde.

  IMPORTANT :

  Ce champ protège contre le double crédit
  après un crash serveur.
  */

  refundBalanceCredited: boolean;


  /*
  Identifiant unique de l'opération
  de remboursement.

  Exemple :

  withdrawal_refund_withdrawal_xxx
  */

  refundTransactionId?: string;


  /*
  Timestamp du crédit du remboursement.
  */

  refundCreditedAt?: number;


  /*
  Indique si le webhook concerné
  a déjà été traité.
  */

  webhookProcessed: boolean;


  /*
  Identifiant unique de l'événement webhook
  si MonCashConnect en fournit un.

  Permet de renforcer l'idempotence.
  */

  webhookEventId?: string;


  /*
  Timestamp de création
  */

  createdAt: number;


  /*
  Timestamp de dernière modification
  */

  updatedAt: number;


  /*
  Timestamp de finalisation
  */

  completedAt?: number;


  /*
  Timestamp d'échec
  */

  failedAt?: number;


  /*
  Timestamp de remboursement finalisé
  */

  refundedAt?: number;
}


/*
====================================================
RÉPONSE PAYOUT-CREATE MONCASHCONNECT
====================================================
*/

export interface MonCashPayoutCreateResponse {

  /*
  ID du payout côté MonCashConnect
  */

  id?: string;


  /*
  Statut initial
  */

  status: MonCashPayoutStatus;


  /*
  Référence envoyée à MonCashConnect
  */

  referenceId?: string;


  /*
  Montant du retrait
  */

  amount?: number;


  /*
  Frais réseau MonCash
  */

  fee_htg?: number;


  /*
  Message éventuel retourné par le provider
  */

  message?: string;


  /*
  Code d'erreur éventuel
  */

  code?: string;
}


/*
====================================================
PAYLOAD WEBHOOK MONCASHCONNECT
====================================================
*/

export interface MonCashPayoutWebhookPayload {

  /*
  Type d'événement
  */

  event: MonCashPayoutEvent;


  /*
  ID unique de l'événement webhook.

  Optionnel car le provider peut ne pas
  fournir ce champ.
  */

  eventId?: string;


  /*
  ID du payout
  */

  payoutId?: string;


  /*
  Référence TiTaTo
  */

  referenceId?: string;


  /*
  Statut du payout
  */

  status?: MonCashPayoutStatus;


  /*
  Montant
  */

  amount?: number;


  /*
  Frais
  */

  fee_htg?: number;


  /*
  Message d'erreur
  */

  message?: string;


  /*
  Timestamp fourni par le provider
  */

  timestamp?: number;
}


/*
====================================================
RÉSULTAT DU SERVICE DE RETRAIT
====================================================
*/

export interface WithdrawalServiceResult {

  /*
  Succès ou échec de l'opération.
  */

  success: boolean;


  /*
  ID du retrait TiTaTo.
  */

  withdrawalId?: string;


  /*
  Statut du retrait.
  */

  status?: WithdrawalStatus;


  /*
  Message destiné au client.
  */

  message?: string;


  /*
  Erreur interne ou métier.
  */

  error?: string;
}


/*
====================================================
RÉSULTAT DU WEBHOOK
====================================================
*/

export interface WithdrawalWebhookResult {

  /*
  Indique si le webhook a été traité.
  */

  success: boolean;


  /*
  Indique si l'événement avait déjà
  été traité.
  */

  alreadyProcessed?: boolean;


  /*
  Indique si le webhook a été ignoré
  car le retrait était déjà finalisé.
  */

  ignored?: boolean;


  /*
  ID du retrait concerné.
  */

  withdrawalId?: string;


  /*
  Nouveau statut.
  */

  status?: WithdrawalStatus;


  /*
  Message éventuel.
  */

  message?: string;
}