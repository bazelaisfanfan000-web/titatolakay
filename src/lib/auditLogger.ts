import { adminDB } from "@/lib/firebaseAdmin";

/**
 * Système de Logs d'Audit
 * 
 * Enregistre toutes les opérations sensibles pour traçabilité
 * et conformité réglementaire.
 * 
 * Structure:
 * auditLogs/{logId}
 *   - uid: string
 *   - action: string (type d'action)
 *   - details: object (détails de l'action)
 *   - ipAddress: string
 *   - userAgent: string
 *   - timestamp: number
 *   - status: "success" | "failure"
 */

export interface AuditLog {
  id: string;
  uid: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  status: "success" | "failure";
}

/**
 * Actions d'audit prédéfinies
 */
export const AuditActions = {
  // Dépôts
  DEPOSIT_CREATED: "deposit_created",
  DEPOSIT_COMPLETED: "deposit_completed",
  DEPOSIT_FAILED: "deposit_failed",
  
  // Retraits
  WITHDRAWAL_CREATED: "withdrawal_created",
  WITHDRAWAL_COMPLETED: "withdrawal_completed",
  WITHDRAWAL_FAILED: "withdrawal_failed",
  WITHDRAWAL_REFUNDED: "withdrawal_refunded",
  
  // Jeux
  BET_PLACED: "bet_placed",
  GAME_CREATED: "game_created",
  GAME_JOINED: "game_joined",
  GAME_COMPLETED: "game_completed",
  GAME_WINNER_INVALID: "game_winner_invalid",
  REWARD_CREDITED: "reward_credited",
  
  // Revanche
  REVENGE_REQUESTED: "revenge_requested",
  REVENGE_ACCEPTED: "revenge_accepted",
  REVENGE_REJECTED: "revenge_rejected",
  
  // Sécurité
  LOGIN_ATTEMPT: "login_attempt",
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  WEBHOOK_RECEIVED: "webhook_received",
  WEBHOOK_VERIFIED: "webhook_verified",
  WEBHOOK_FAILED: "webhook_failed",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  
  // Admin
  BALANCE_MODIFIED: "balance_modified",
  USER_BANNED: "user_banned",
  USER_UNBANNED: "user_unbanned",
  ADMIN_ACTION: "admin_action"
} as const;

/**
 * Crée un log d'audit
 */
export async function createAuditLog(
  uid: string,
  action: string,
  details: Record<string, any>,
  status: "success" | "failure" = "success",
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const auditRef = adminDB.ref("auditLogs").push();
  const logId = auditRef.key;

  if (!logId) {
    throw new Error("Impossible de créer le log d'audit");
  }

  const log: AuditLog = {
    id: logId,
    uid,
    action,
    details,
    timestamp: Date.now(),
    status
  };

  // N'inclure ipAddress et userAgent que s'ils sont définis
  if (ipAddress !== undefined) {
    log.ipAddress = ipAddress;
  }
  if (userAgent !== undefined) {
    log.userAgent = userAgent;
  }

  await auditRef.set(log);

  console.log("[AUDIT]", {
    uid,
    action,
    status,
    details
  });

  return logId;
}

/**
 * Log de création de dépôt
 */
export async function logDepositCreated(
  uid: string,
  amount: number,
  depositId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.DEPOSIT_CREATED,
    {
      amount,
      depositId,
      timestamp: Date.now()
    },
    "success",
    ipAddress,
    userAgent
  );
}

/**
 * Log de dépôt complété
 */
export async function logDepositCompleted(
  uid: string,
  amount: number,
  depositId: string,
  referenceId: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.DEPOSIT_COMPLETED,
    {
      amount,
      depositId,
      referenceId
    },
    "success",
    ipAddress
  );
}

/**
 * Log de dépôt échoué
 */
export async function logDepositFailed(
  uid: string,
  amount: number,
  depositId: string,
  reason: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.DEPOSIT_FAILED,
    {
      amount,
      depositId,
      reason
    },
    "failure",
    ipAddress
  );
}

/**
 * Log de création de retrait
 */
export async function logWithdrawalCreated(
  uid: string,
  amount: number,
  withdrawalId: string,
  moncashNumber: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.WITHDRAWAL_CREATED,
    {
      amount,
      withdrawalId,
      moncashNumber: moncashNumber.substring(0, 4) + "****" // Masquer le numéro
    },
    "success",
    ipAddress,
    userAgent
  );
}

/**
 * Log de retrait complété
 */
export async function logWithdrawalCompleted(
  uid: string,
  amount: number,
  withdrawalId: string,
  reference: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.WITHDRAWAL_COMPLETED,
    {
      amount,
      withdrawalId,
      reference
    },
    "success",
    ipAddress
  );
}

/**
 * Log de retrait échoué
 */
export async function logWithdrawalFailed(
  uid: string,
  amount: number,
  withdrawalId: string,
  reason: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.WITHDRAWAL_FAILED,
    {
      amount,
      withdrawalId,
      reason
    },
    "failure",
    ipAddress
  );
}

/**
 * Log de retrait remboursé
 */
export async function logWithdrawalRefunded(
  uid: string,
  amount: number,
  withdrawalId: string,
  reason: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.WITHDRAWAL_REFUNDED,
    {
      amount,
      withdrawalId,
      reason
    },
    "success",
    ipAddress
  );
}

/**
 * Log de webhook reçu
 */
export async function logWebhookReceived(
  eventType: string,
  referenceId: string,
  ipAddress?: string
): Promise<string> {
  return createAuditLog(
    "system",
    AuditActions.WEBHOOK_RECEIVED,
    {
      eventType,
      referenceId
    },
    "success",
    ipAddress
  );
}

/**
 * Log de webhook vérifié
 */
export async function logWebhookVerified(
  eventType: string,
  referenceId: string,
  uid?: string
): Promise<string> {
  return createAuditLog(
    uid || "system",
    AuditActions.WEBHOOK_VERIFIED,
    {
      eventType,
      referenceId
    },
    "success"
  );
}

/**
 * Log de webhook échoué
 */
export async function logWebhookFailed(
  eventType: string,
  referenceId: string,
  reason: string
): Promise<string> {
  return createAuditLog(
    "system",
    AuditActions.WEBHOOK_FAILED,
    {
      eventType,
      referenceId,
      reason
    },
    "failure"
  );
}

/**
 * Log de tentative de connexion
 */
export async function logLoginAttempt(
  uid: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.LOGIN_ATTEMPT,
    {},
    "success",
    ipAddress,
    userAgent
  );
}

/**
 * Log de connexion réussie
 */
export async function logLoginSuccess(
  uid: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.LOGIN_SUCCESS,
    {},
    "success",
    ipAddress,
    userAgent
  );
}

/**
 * Log de connexion échouée
 */
export async function logLoginFailed(
  uid: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createAuditLog(
    uid,
    AuditActions.LOGIN_FAILED,
    { reason },
    "failure",
    ipAddress,
    userAgent
  );
}

/**
 * Récupère les logs d'audit d'un utilisateur
 */
export async function getUserAuditLogs(
  uid: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const auditRef = adminDB
    .ref("auditLogs")
    .orderByChild("uid")
    .equalTo(uid)
    .limitToLast(limit);

  const snapshot = await auditRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const logs: AuditLog[] = [];

  snapshot.forEach((child: any) => {
    logs.push(child.val());
  });

  return logs.reverse();
}

/**
 * Récupère les logs d'audit système
 */
export async function getSystemAuditLogs(
  limit: number = 100
): Promise<AuditLog[]> {
  const auditRef = adminDB
    .ref("auditLogs")
    .orderByChild("timestamp")
    .limitToLast(limit);

  const snapshot = await auditRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const logs: AuditLog[] = [];

  snapshot.forEach((child: any) => {
    logs.push(child.val());
  });

  return logs.reverse();
}
