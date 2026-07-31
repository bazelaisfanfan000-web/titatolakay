import { NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { requireAdminAuth } from '@/lib/adminAuth';
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate limiting pour admin
  const rateLimitResult = await rateLimitMiddleware(
    request,
    'admin',
    RATE_LIMIT_CONFIGS.admin
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json({
      success: false,
      error: 'Trop de requêtes. Réessayez plus tard.'
    }, {
      status: 429
    });
  }

  // Vérifier la session admin
  const authError = await requireAdminAuth(request as any);
  if (authError) return authError;

  try {
    // Calculer le capital total des utilisateurs
    const usersRef = adminDB.ref('users');
    const usersSnapshot = await usersRef.get();

    let totalUserCapital = 0;
    let totalUsers = 0;

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      totalUsers = Object.keys(users).length;

      Object.values(users).forEach((user: any) => {
        const balance = Number(user.balance || user.walletBalance || 0);
        totalUserCapital += balance;
      });
    }

    // Solde plateforme = capital total utilisateurs (sans déduction MonCash)
    const platformBalance = totalUserCapital;

    return NextResponse.json({
      success: true,
      data: {
        totalUserCapital,
        platformBalance,
        totalUsers,
      },
    });
  } catch (error) {
    console.error('[ADMIN_FINANCE_STATS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des statistiques financières' },
      { status: 500 }
    );
  }
}
