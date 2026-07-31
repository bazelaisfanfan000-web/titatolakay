import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { adminDB } from './firebaseAdmin';

const ADMIN_SESSION_TTL = 60 * 60 * 24 * 1000; // 24 heures en millisecondes

/**
 * Vérifie si la session admin est valide
 */
export async function verifyAdminSession(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return { valid: false, error: 'Session admin manquante' };
    }

    const sessionId = sessionCookie.value;

    // Vérifier si la session existe dans Firebase
    const sessionRef = adminDB.ref(`adminSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists()) {
      return { valid: false, error: 'Session invalide ou expirée' };
    }

    const session = sessionSnap.val();

    // Vérifier si la session est expirée
    const now = Date.now();
    if (now - session.createdAt > ADMIN_SESSION_TTL) {
      // Nettoyer la session expirée
      await sessionRef.remove();
      return { valid: false, error: 'Session expirée' };
    }

    // Mettre à jour le lastAccess
    await sessionRef.update({ lastAccess: now });

    return { valid: true };
  } catch (error) {
    console.error('[ADMIN_SESSION_VERIFY_ERROR]', error);
    return { valid: false, error: 'Erreur de vérification de session' };
  }
}

/**
 * Crée une nouvelle session admin sécurisée
 */
export async function createAdminSession(): Promise<string> {
  const sessionId = randomUUID();
  const now = Date.now();

  await adminDB.ref(`adminSessions/${sessionId}`).set({
    sessionId,
    createdAt: now,
    lastAccess: now,
  });

  return sessionId;
}

/**
 * Supprime une session admin
 */
export async function deleteAdminSession(sessionId: string): Promise<void> {
  await adminDB.ref(`adminSessions/${sessionId}`).remove();
}

/**
 * Middleware pour protéger les routes admin
 */
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const verification = await verifyAdminSession(request);

  if (!verification.valid) {
    return NextResponse.json(
      { success: false, error: verification.error || 'Non autorisé' },
      { status: 401 }
    );
  }

  return null; // Session valide, continuer
}

/**
 * Nettoie les sessions expirées (à appeler via cron)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  const sessionsRef = adminDB.ref('adminSessions');
  const sessionsSnap = await sessionsRef.get();

  if (!sessionsSnap.exists()) {
    return;
  }

  const sessions = sessionsSnap.val();
  const expiredSessions: string[] = [];

  Object.entries(sessions).forEach(([sessionId, session]: [string, any]) => {
    if (now - session.createdAt > ADMIN_SESSION_TTL) {
      expiredSessions.push(sessionId);
    }
  });

  // Supprimer les sessions expirées
  for (const sessionId of expiredSessions) {
    await sessionsRef.child(sessionId).remove();
  }

  console.log(`[ADMIN_SESSION_CLEANUP] ${expiredSessions.length} sessions expirées supprimées`);
}
