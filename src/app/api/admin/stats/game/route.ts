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
    // Statistiques des utilisateurs
    const usersRef = adminDB.ref('users');
    const usersSnapshot = await usersRef.get();

    let totalUsers = 0;
    let onlineUsers = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newUsersToday = 0;

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      totalUsers = Object.keys(users).length;

      Object.values(users).forEach((user: any) => {
        // Compter les utilisateurs en ligne
        if (user.status === 'online' || user.online === true) {
          onlineUsers++;
        }

        // Compter les nouveaux utilisateurs aujourd'hui
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          if (userDate >= today) {
            newUsersToday++;
          }
        }
      });
    }

    // Statistiques des parties
    const roomsRef = adminDB.ref('rooms');
    const roomsSnapshot = await roomsRef.get();

    let totalGames = 0;
    let gamesToday = 0;
    let gamesInProgress = 0;
    let gamesCompleted = 0;

    if (roomsSnapshot.exists()) {
      const rooms = roomsSnapshot.val();
      totalGames = Object.keys(rooms).length;

      Object.values(rooms).forEach((room: any) => {
        // Parties en cours
        if (room.status === 'playing' || room.game?.status === 'playing') {
          gamesInProgress++;
        }

        // Parties terminées
        if (room.status === 'finished' || room.game?.status === 'finished') {
          gamesCompleted++;
        }

        // Parties aujourd'hui
        if (room.createdAt) {
          const roomDate = new Date(room.createdAt);
          if (roomDate >= today) {
            gamesToday++;
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          online: onlineUsers,
          newToday: newUsersToday,
        },
        games: {
          total: totalGames,
          today: gamesToday,
          inProgress: gamesInProgress,
          completed: gamesCompleted,
        },
      },
    });
  } catch (error) {
    console.error('[ADMIN_GAME_STATS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des statistiques du jeu' },
      { status: 500 }
    );
  }
}
