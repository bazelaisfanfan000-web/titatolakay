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
    const status = searchParams.get('status'); // 'waiting', 'playing', 'finished'

    const roomsRef = adminDB.ref('rooms');
    const roomsSnapshot = await roomsRef.get();

    if (!roomsSnapshot.exists()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const rooms = roomsSnapshot.val();
    const roomsList = Object.entries(rooms).map(([roomId, room]: [string, any]) => ({
      roomId,
      ...room,
    }));

    // Filter by status if provided
    let filteredRooms = roomsList;
    if (status) {
      filteredRooms = roomsList.filter((room: any) => room.status === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredRooms,
    });
  } catch (error) {
    console.error('[ADMIN_GAMES_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des parties' },
      { status: 500 }
    );
  }
}
