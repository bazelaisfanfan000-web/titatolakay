/**
 * Utilitaires Firebase
 */

/**
 * Nettoie une clé pour l'utiliser dans Firebase Realtime Database
 * Firebase interdit les caractères: . # $ [ ] /
 * Ils sont remplacés par _
 */
export function sanitizeFirebaseKey(key: string): string {
  if (!key) return key;
  return key.replace(/[.#$\[\]\/]/g, '_');
}
