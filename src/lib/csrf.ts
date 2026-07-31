/**
 * CSRF Protection
 * 
 * Protection contre les attaques CSRF avec tokens
 */

import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Génère un token CSRF sécurisé
 */
export function generateCsrfToken(): string {
  return randomUUID().replace(/-/g, '').substring(0, CSRF_TOKEN_LENGTH);
}

/**
 * Définit le token CSRF dans un cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 heures
    path: '/',
  });
  
  return token;
}

/**
 * Récupère le token CSRF depuis le cookie
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Vérifie le token CSRF depuis le header
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  // En développement, on peut désactiver la vérification
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    return true;
  }
  
  // Pour les requêtes GET, HEAD, OPTIONS, pas besoin de CSRF
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  // Récupérer le token depuis le cookie
  const cookieToken = await getCsrfToken();
  if (!cookieToken) {
    return false;
  }
  
  // Récupérer le token depuis le header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return false;
  }
  
  // Comparer les tokens
  return cookieToken === headerToken;
}

/**
 * Middleware pour vérifier le CSRF
 */
export async function requireCsrfProtection(request: Request): Promise<{ valid: boolean; error?: string }> {
  const isValid = await verifyCsrfToken(request);
  
  if (!isValid) {
    return {
      valid: false,
      error: 'CSRF token invalide ou manquant'
    };
  }
  
  return { valid: true };
}

/**
 * Supprime le token CSRF
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}

/**
 * Ajoute le token CSRF aux headers de réponse
 */
export function addCsrfTokenToHeaders(headers: Headers, token: string): void {
  headers.set('X-CSRF-Token', token);
}
