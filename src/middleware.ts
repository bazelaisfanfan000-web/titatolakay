import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protection des routes admin
  if (pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get('admin_session');

    // Permettre l'accès à la page de login
    if (pathname === '/admin/login') {
      if (adminSession) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    // Protéger toutes les autres routes admin
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
