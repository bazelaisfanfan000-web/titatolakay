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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const usersRef = adminDB.ref('users');
    const usersSnapshot = await usersRef.get();

    if (!usersSnapshot.exists()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const users = usersSnapshot.val();
    const usersList = Object.entries(users).map(([uid, user]: [string, any]) => ({
      uid,
      ...user,
    }));

    // Filter by search if provided
    let filteredUsers = usersList;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersList.filter((user: any) =>
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.uid?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredUsers,
    });
  } catch (error) {
    console.error('[ADMIN_USERS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}
