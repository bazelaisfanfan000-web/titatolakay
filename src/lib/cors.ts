/**
 * CORS Configuration
 * 
 * Gère les en-têtes CORS pour les API routes
 */

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

/**
 * Vérifie si l'origine est autorisée
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // En développement, autoriser localhost
  if (process.env.NODE_ENV === 'development') {
    return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  }
  
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Ajoute les en-têtes CORS à la réponse
 */
export function addCorsHeaders(response: Response, origin?: string | null): Response {
  const headers = new Headers(response.headers);
  
  if (origin && isOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Max-Age', '86400'); // 24 heures
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Gère les requêtes OPTIONS (pre-flight)
 */
export function handleCorsPreflight(origin?: string | null): Response {
  if (origin && !isOriginAllowed(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  
  const headers = new Headers();
  
  if (origin && isOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(null, { status: 204, headers });
}
