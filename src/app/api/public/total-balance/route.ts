import { NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Récupérer tous les utilisateurs
    const usersRef = adminDB.ref('users');
    const usersSnapshot = await usersRef.once('value');

    let totalUserCapital = 0;
    let totalUsers = 0;
    const usersList: Array<{
      id: string;
      email?: string;
      balance: number;
      createdAt?: number;
      createdAtDate?: string;
    }> = [];

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      totalUsers = Object.keys(users).length;

      Object.entries(users).forEach(([userId, user]: [string, any]) => {
        const balance = Number(user.balance || user.walletBalance || 0);
        totalUserCapital += balance;

        usersList.push({
          id: userId,
          email: user.email,
          balance,
          createdAt: user.createdAt,
          createdAtDate: user.createdAt ? new Date(user.createdAt).toLocaleString('fr-HT') : 'N/A',
        });
      });
    }

    // Trier par solde décroissant
    usersList.sort((a, b) => b.balance - a.balance);

    return NextResponse.json({
      totalBalance: totalUserCapital,
      totalUsers,
      users: usersList,
    });
  } catch (error) {
    console.error('[PUBLIC_TOTAL_BALANCE_ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde total' },
      { status: 500 }
    );
  }
}
