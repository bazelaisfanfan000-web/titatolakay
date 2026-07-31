/**
 * MonCashConnect API Client
 * Intégration atomique et sécurisée avec MonCashConnect
 */

import crypto from 'crypto';
import type {
  MonCashPaymentRequest,
  MonCashPaymentResponse,
  MonCashPaymentStatus,
  MonCashPayoutRequest,
  MonCashPayoutResponse,
  MonCashBalance,
  MonCashWebhookEvent
} from '@/types/wallet';

const BASE_URL = process.env.MONCASH_API_URL || "https://api.moncashconnect.com/v1";
const API_KEY = process.env.MONCASHCONNECT_SECRET_KEY || process.env.MONCASH_API_KEY || "";
const WEBHOOK_SECRET = process.env.MONCASH_WEBHOOK_SECRET || "";

/**
 * Vérifie la configuration MonCash
 */
export function validateMonCashConfig(): { valid: boolean; error?: string } {
  if (!API_KEY) {
    return { valid: false, error: "Clé API MonCash manquante (MONCASHCONNECT_SECRET_KEY)" };
  }
  
  if (!API_KEY.startsWith("sk_proj_")) {
    return { valid: false, error: "Clé API invalide (doit commencer par sk_proj_)" };
  }
  
  if (!WEBHOOK_SECRET) {
    console.warn("[MONCASH] Webhook secret manquant (MONCASH_WEBHOOK_SECRET)");
  }
  
  return { valid: true };
}

/**
 * Génère un referenceId unique
 */
export function generateReferenceId(prefix: string = "txn"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Génère une clé d'idempotence unique
 */
export function generateIdempotencyKey(): string {
  return `idemp_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Crée un paiement MonCash avec idempotence
 */
export async function createMonCashPayment(
  request: MonCashPaymentRequest,
  idempotencyKey?: string
): Promise<MonCashPaymentResponse> {
  const config = validateMonCashConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  const key = idempotencyKey || generateIdempotencyKey();

  console.log("[MONCASH] Création paiement:", {
    amount: request.amount,
    referenceId: request.referenceId,
    returnUrl: request.returnUrl,
    customerName: request.customerName,
    customerEmail: request.customerEmail,
    idempotencyKey: key
  });

  const response = await fetch(`${BASE_URL}/pay-create`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key
    },
    body: JSON.stringify(request)
  });

  const data = await response.json();

  console.log("[MONCASH] Réponse paiement:", {
    status: response.status,
    paymentUrl: data.paymentUrl,
    reference: data.reference,
    expiresAt: data.expiresAt
  });

  if (!response.ok) {
    throw new Error(`MonCash API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Vérifie le statut d'un paiement
 */
export async function getPaymentStatus(referenceId: string): Promise<MonCashPaymentStatus> {
  const config = validateMonCashConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  const response = await fetch(
    `${BASE_URL}/pay-status?referenceId=${referenceId}`,
    {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`MonCash API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Crée un payout MonCash avec idempotence
 */
export async function createMonCashPayout(
  request: MonCashPayoutRequest,
  idempotencyKey?: string
): Promise<MonCashPayoutResponse> {
  const config = validateMonCashConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  const key = idempotencyKey || generateIdempotencyKey();

  console.log("[MONCASH] Création payout:", {
    amount: request.amount,
    moncashNumber: request.moncashNumber,
    referenceId: request.referenceId,
    idempotencyKey: key
  });

  const response = await fetch(`${BASE_URL}/payout-create`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key
    },
    body: JSON.stringify(request)
  });

  const data = await response.json();

  console.log("[MONCASH] Réponse payout:", {
    status: response.status,
    data
  });

  if (!response.ok) {
    throw new Error(`MonCash API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Récupère le solde du compte marchand
 */
export async function getMerchantBalance(): Promise<MonCashBalance> {
  const config = validateMonCashConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  const response = await fetch(`${BASE_URL}/pay-balance`, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`MonCash API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[MONCASH] Webhook secret non configuré");
    return false;
  }

  // Vérifier le timestamp (max 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp);
  const timeDiff = Math.abs(now - webhookTimestamp);

  if (timeDiff > 300) {
    console.error("[MONCASH] Timestamp expiré:", {
      webhookTimestamp,
      now,
      diff: timeDiff
    });
    return false;
  }

  // Extraire la signature (format: sha256=...)
  const signatureHash = signature.replace("sha256=", "");

  // Calculer HMAC-SHA256
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signatureHash, "hex"),
    Buffer.from(expectedSignature, "hex")
  );

  if (!isValid) {
    console.error("[MONCASH] Signature invalide");
  }

  return isValid;
}

/**
 * Parse et valide un webhook MonCash
 */
export function parseWebhook(
  body: string,
  signature: string,
  timestamp: string
): MonCashWebhookEvent | null {
  if (!verifyWebhookSignature(body, signature, timestamp)) {
    return null;
  }

  try {
    const event = JSON.parse(body) as MonCashWebhookEvent;
    console.log("[MONCASH] Webhook reçu:", event);
    return event;
  } catch (error) {
    console.error("[MONCASH] Erreur parsing webhook:", error);
    return null;
  }
}

/**
 * Types d'erreurs MonCash
 */
export class MonCashError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "MonCashError";
  }
}

/**
 * Gestionnaire d'erreurs MonCash
 */
export function handleMonCashError(error: any): MonCashError {
  if (error instanceof MonCashError) {
    return error;
  }

  // Erreurs HTTP courantes
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        return new MonCashError("Clé API invalide", 401, "invalid_api_key");
      case 403:
        return new MonCashError("Accès refusé", 403, "access_denied");
      case 409:
        return new MonCashError("ReferenceId déjà utilisé", 409, "duplicate_reference");
      case 422:
        return new MonCashError("Paramètres invalides", 422, "invalid_parameters");
      case 502:
        return new MonCashError("Erreur serveur MonCash", 502, "server_error");
      default:
        return new MonCashError(
          data?.error || "Erreur MonCash",
          status,
          data?.code
        );
    }
  }

  // Erreurs réseau
  if (error.code === "ECONNREFUSED") {
    return new MonCashError("Connexion refusée", 503, "connection_refused");
  }

  if (error.code === "ETIMEDOUT") {
    return new MonCashError("Timeout", 504, "timeout");
  }

  // Erreur générique
  return new MonCashError(
    error.message || "Erreur inconnue",
    500,
    "unknown_error"
  );
}