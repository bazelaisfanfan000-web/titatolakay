import { NextResponse } from 'next/server';
import { getAdminLogs } from '@/lib/adminLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const logs = await getAdminLogs(limit);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[ADMIN_LOGS_API_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des logs admin' },
      { status: 500 }
    );
  }
}
