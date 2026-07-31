import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (sessionCookie) {
      // Supprimer la session de Firebase
      await deleteAdminSession(sessionCookie.value);
      // Supprimer le cookie
      cookieStore.delete('admin_session');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_LOGOUT_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
