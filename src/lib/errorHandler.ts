/**
 * Error Handler
 * 
 * Gestion centralisée des erreurs avec logging structuré
 */

import { adminDB } from './firebaseAdmin';

export interface ErrorContext {
  uid?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  body?: any;
  timestamp: number;
}

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: ErrorContext;
  isOperational?: boolean;
}

/**
 * Classes d'erreurs personnalisées
 */
export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'AuthenticationError';
    this.context = context;
  }
}

export class AuthorizationError extends Error implements AppError {
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'AuthorizationError';
    this.context = context;
  }
}

export class NotFoundError extends Error implements AppError {
  code = 'NOT_FOUND';
  statusCode = 404;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'NotFoundError';
    this.context = context;
  }
}

export class RateLimitError extends Error implements AppError {
  code = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'RateLimitError';
    this.context = context;
  }
}

export class DatabaseError extends Error implements AppError {
  code = 'DATABASE_ERROR';
  statusCode = 500;
  isOperational = false;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'DatabaseError';
    this.context = context;
  }
}

export class ExternalServiceError extends Error implements AppError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
  isOperational = true;
  context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'ExternalServiceError';
    this.context = context;
  }
}

/**
 * Logger d'erreurs structuré
 */
class ErrorLogger {
  /**
   * Log une erreur dans Firebase
   */
  async logError(error: AppError, context?: ErrorContext): Promise<void> {
    const errorRef = adminDB.ref('errorLogs').push();
    const errorId = errorRef.key;

    if (!errorId) {
      console.error('[ERROR_LOGGER] Impossible de créer le log d\'erreur');
      return;
    }

    const errorLog = {
      id: errorId,
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      isOperational: error.isOperational,
      context: {
        ...context,
        ...error.context,
      },
      timestamp: Date.now(),
    };

    await errorRef.set(errorLog);

    console.error('[ERROR_LOGGED]', {
      name: error.name,
      message: error.message,
      code: error.code,
      context: errorLog.context,
    });
  }

  /**
   * Log une erreur critique (alerte immédiate)
   */
  async logCriticalError(error: AppError, context?: ErrorContext): Promise<void> {
    const criticalRef = adminDB.ref('criticalErrors').push();
    const errorId = criticalRef.key;

    if (!errorId) {
      console.error('[ERROR_LOGGER] Impossible de créer le log d\'erreur critique');
      return;
    }

    const criticalLog = {
      id: errorId,
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      context: {
        ...context,
        ...error.context,
      },
      timestamp: Date.now(),
      resolved: false,
    };

    await criticalRef.set(criticalLog);

    console.error('[CRITICAL_ERROR_LOGGED]', {
      name: error.name,
      message: error.message,
      code: error.code,
      context: criticalLog.context,
    });
  }

  /**
   * Nettoie les anciens logs d'erreur (plus de 30 jours)
   */
  async cleanupOldErrorLogs(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const errorLogsRef = adminDB.ref('errorLogs');
    const snapshot = await errorLogsRef
      .orderByChild('timestamp')
      .endAt(thirtyDaysAgo)
      .once('value');

    if (!snapshot.exists()) return;

    const logs = snapshot.val();
    let deletedCount = 0;

    for (const [logId] of Object.entries(logs)) {
      await errorLogsRef.child(logId).remove();
      deletedCount++;
    }

    console.log(`[ERROR_LOGGER_CLEANUP] ${deletedCount} anciens logs supprimés`);
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Handler d'erreurs global
 */
export async function handleError(
  error: Error | AppError,
  context?: ErrorContext
): Promise<AppError> {
  // Si ce n'est pas déjà une AppError, la convertir
  if (!('code' in error)) {
    const appError: AppError = error as Error;
    appError.code = 'INTERNAL_ERROR';
    appError.statusCode = 500;
    appError.isOperational = false;
  }

  const appError = error as AppError;
  appError.context = {
    ...context,
    ...appError.context,
    timestamp: context?.timestamp || appError.context?.timestamp || Date.now(),
  };

  // Logger l'erreur
  await errorLogger.logError(appError, context);

  // Si c'est une erreur critique, logger comme critique
  if (!appError.isOperational) {
    await errorLogger.logCriticalError(appError, context);
  }

  return appError;
}

/**
 * Wrapper pour les fonctions async avec gestion d'erreurs
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = await handleError(error as Error, context);
    return { success: false, error: appError };
  }
}

/**
 * Extrait le contexte de la requête
 */
export function extractRequestContext(request: Request, uid?: string): ErrorContext {
  return {
    uid,
    endpoint: request.url,
    method: request.method,
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: Date.now(),
  };
}
