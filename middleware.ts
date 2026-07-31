import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware pour vérifier l'acceptation des règles
 * Redirige les utilisateurs vers /rules s'ils n'ont pas accepté les règles
 */
export function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;


  /*
  ==================================================
  ROUTES PUBLIQUES (pas de vérification)
  ==================================================
  */

  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/rules',
    '/conditions-utilisation',
    '/politique-confidentialite',
  ];


  /*
  ==================================================
  ROUTES API (pas de vérification)
  ==================================================
  */

  const isApiRoute = pathname.startsWith('/api');


  /*
  ==================================================
  FICHIERS STATIQUES (pas de vérification)
  ==================================================
  */

  const isStaticFile = pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.');


  /*
  ==================================================
  PERMETTRE L'ACCÈS AUX ROUTES PUBLIQUES
  ==================================================
  */

  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    isApiRoute ||
    isStaticFile
  ) {

    return NextResponse.next();

  }


  /*
  ==================================================
  VÉRIFIER LE COOKIE D'AUTHENTIFICATION
  ==================================================
  */

  const token = request.cookies.get('firebase-token')?.value;


  /*
  ==================================================
  SI PAS CONNECTÉ, REDIRIGER VERS LOGIN
  ==================================================
  */

  if (!token) {

    return NextResponse.redirect(
      new URL('/login', request.url)
    );

  }


  /*
  ==================================================
  VÉRIFIER SI RÈGLES ACCEPTÉES
  ==================================================
  */

  const rulesAccepted = request.cookies.get('rules-accepted')?.value;


  /*
  ==================================================
  SI RÈGLES NON ACCEPTÉES, REDIRIGER VERS RULES
  ==================================================
  */

  if (!rulesAccepted || rulesAccepted !== 'true') {

    return NextResponse.redirect(
      new URL('/rules', request.url)
    );

  }


  /*
  ==================================================
  AUTORISER L'ACCÈS
  ==================================================
  */

  return NextResponse.next();

}


/*
====================================================
CONFIGURATION DU MIDDLEWARE
====================================================
*/

export const config = {
  matcher: [
    /*
    ================================================
    EXCLURE CERTAINES ROUTES
    ================================================
    */

    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
