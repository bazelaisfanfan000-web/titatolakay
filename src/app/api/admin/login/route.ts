import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSession } from '@/lib/adminAuth';
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Rate limiting strict pour admin login
    const rateLimitResult = await rateLimitMiddleware(
      request,
      'adminLogin',
      {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5 // 5 tentatives seulement
      }
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    // Vérifier le mot de passe admin depuis les variables d'environnement
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Configuration serveur incorrecte' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Créer une session admin sécurisée avec UUID
    const sessionId = await createAdminSession();

    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 heures
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_LOGIN_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
