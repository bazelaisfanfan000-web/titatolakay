/*
====================================================
TiTaTo - Rate Limiting Middleware
====================================================

Protection contre les attaques par force brute
et les abus d'API.

Limite le nombre de requêtes par utilisateur/IP.
====================================================
*/

// Stockage en mémoire pour le rate limiting (en production, utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre maximum de requêtes
}

const ADMIN_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 requêtes par fenêtre pour les endpoints admin
};

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requêtes par fenêtre (augmenté pour développement)
};

const STRICT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requêtes par fenêtre (augmenté pour développement)
};

/**
 * Génère une clé de rate limiting basée sur l'UID ou l'IP
 */
function getRateLimitKey(identifier: string, endpoint: string): string {
  return `ratelimit:${endpoint}:${identifier}`;
}

/**
 * Nettoie les entrées expirées du store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Vérifie si une requête est autorisée selon le rate limit
 * @param identifier - UID de l'utilisateur ou IP
 * @param endpoint - Nom de l'endpoint
 * @param config - Configuration du rate limit
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries();

  const key = getRateLimitKey(identifier, endpoint);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Nouvelle fenêtre ou fenêtre expirée
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Fenêtre en cours
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Incrémenter le compteur
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Middleware Next.js pour le rate limiting
 * @param request - Request object
 * @param endpoint - Nom de l'endpoint
 * @param config - Configuration du rate limit
 */
export async function rateLimitMiddleware(
  request: Request,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Essayer d'obtenir l'UID depuis le header Authorization
  const authHeader = request.headers.get("authorization");
  let identifier = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      // Extraire l'UID du token (simplifié - en production, vérifier avec Firebase Admin)
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        identifier = payload.user_id || payload.uid || "";
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }

  // Fallback sur l'IP
  if (!identifier) {
    const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";
    identifier = ip.split(",")[0].trim();
  }

  return checkRateLimit(identifier, endpoint, config);
}

/**
 * Configuration pour les endpoints sensibles
 */
export const RATE_LIMIT_CONFIGS = {
  admin: ADMIN_CONFIG,
  deposit: STRICT_CONFIG,
  withdraw: STRICT_CONFIG,
  gameCreate: DEFAULT_CONFIG,
  gameJoin: DEFAULT_CONFIG,
  finishPayment: STRICT_CONFIG,
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 webhooks par minute
  },
};
