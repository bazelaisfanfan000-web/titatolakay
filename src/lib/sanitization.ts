/**
 * Input Sanitization
 * 
 * Nettoyage et validation des inputs utilisateur
 */

/**
 * Nettoie une chaîne de caractères
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Supprime les caractères HTML
    .replace(/javascript:/gi, '') // Supprime les protocoles javascript
    .substring(0, 1000); // Limite la longueur
}

/**
 * Nettoie un numéro de téléphone
 */
export function sanitizePhoneNumber(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/\D/g, '') // Garde uniquement les chiffres
    .substring(0, 15); // Limite la longueur
}

/**
 * Nettoie un email
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .toLowerCase()
    .substring(0, 254); // Limite selon RFC 5321
}

/**
 * Nettoie un ID utilisateur (UID)
 */
export function sanitizeUid(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '') // Garde uniquement les caractères alphanumériques, underscore et tiret
    .substring(0, 128);
}

/**
 * Nettoie un ID de room ou de transaction
 */
export function sanitizeId(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 100);
}

/**
 * Valide et nettoie un nombre
 */
export function sanitizeNumber(input: any): number | null {
  const num = Number(input);
  
  if (!Number.isFinite(num)) return null;
  if (num < Number.MIN_SAFE_INTEGER || num > Number.MAX_SAFE_INTEGER) return null;
  
  return num;
}

/**
 * Nettoie un objet (récursif)
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }
  
  if (typeof obj === 'number') {
    return sanitizeNumber(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  
  return obj;
}

/**
 * Valide qu'une chaîne ne contient pas de caractères dangereux
 */
export function containsDangerousChars(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Nettoie les données de requête
 */
export function sanitizeRequestData<T>(data: T): T {
  try {
    return sanitizeObject(data);
  } catch (error) {
    console.error('[SANITIZATION_ERROR]', error);
    return data;
  }
}
