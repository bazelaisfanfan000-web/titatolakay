import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const verification = await verifyAdminSession(request);
    return NextResponse.json(verification);
  } catch (error) {
    console.error('[VERIFY_SESSION_ERROR]', error);
    return NextResponse.json(
      { valid: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
