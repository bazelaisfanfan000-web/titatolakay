import { NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Calculer le capital total des utilisateurs
    const usersRef = adminDB.ref('users');
    const usersSnapshot = await usersRef.once('value');

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

    return NextResponse.json({
      totalBalance: totalUserCapital,
      totalUsers,
    });
  } catch (error) {
    console.error('[PUBLIC_TOTAL_BALANCE_ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde total' },
      { status: 500 }
    );
  }
}
