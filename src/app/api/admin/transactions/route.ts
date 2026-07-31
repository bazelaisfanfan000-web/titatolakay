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
    const type = searchParams.get('type'); // 'deposit', 'withdraw', 'reward', 'commission'
    const period = searchParams.get('period'); // 'today', 'week', 'month'

    const transactionsRef = adminDB.ref('transactions');
    const transactionsSnapshot = await transactionsRef.get();

    if (!transactionsSnapshot.exists()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const transactions = transactionsSnapshot.val();
    let transactionsList: any[] = [];

    // Flatten transactions from all users
    Object.entries(transactions).forEach(([uid, userTransactions]: [string, any]) => {
      Object.entries(userTransactions).forEach(([transactionId, transaction]: [string, any]) => {
        transactionsList.push({
          transactionId,
          uid,
          ...transaction,
        });
      });
    });

    // Filter by type if provided
    if (type) {
      transactionsList = transactionsList.filter((t: any) => t.type === type);
    }

    // Filter by period if provided
    if (period) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      if (period === 'today') {
        transactionsList = transactionsList.filter((t: any) => 
          t.createdAt && (now - t.createdAt) < oneDay
        );
      } else if (period === 'week') {
        transactionsList = transactionsList.filter((t: any) => 
          t.createdAt && (now - t.createdAt) < oneWeek
        );
      } else if (period === 'month') {
        transactionsList = transactionsList.filter((t: any) => 
          t.createdAt && (now - t.createdAt) < oneMonth
        );
      }
    }

    // Sort by date descending
    transactionsList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      success: true,
      data: transactionsList,
    });
  } catch (error) {
    console.error('[ADMIN_TRANSACTIONS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des transactions' },
      { status: 500 }
    );
  }
}
