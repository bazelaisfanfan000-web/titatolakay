import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protection des routes admin
  if (pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get('admin_session');

    // Bloquer l'accès direct à /admin/login
    if (pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin-access-denied', request.url));
    }

    // Protéger toutes les autres routes admin
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin-access-denied', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
