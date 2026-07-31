/**
 * Détection de plateforme et compatibilité multi-plateforme
 * Pour les notifications push sur iOS, Android, Desktop
 */

export type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  supportsServiceWorker: boolean;
  supportsPushNotifications: boolean;
  supportsAPNs: boolean;
}

/**
 * Détecte la plateforme actuelle
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
      supportsServiceWorker: false,
      supportsPushNotifications: false,
      supportsAPNs: false,
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Détection iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // Détection Android
  const isAndroid = /android/i.test(userAgent);
  
  // Détection Desktop
  const isDesktop = !isIOS && !isAndroid;
  
  const platform: Platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  
  // Support Service Worker
  const supportsServiceWorker = 'serviceWorker' in navigator;
  
  // Support Notifications Push
  const supportsPushNotifications = 'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;
  
  // Support APNs (iOS uniquement)
  const supportsAPNs = isIOS && supportsPushNotifications;

  return {
    platform,
    isMobile: isIOS || isAndroid,
    isIOS,
    isAndroid,
    isDesktop,
    supportsServiceWorker,
    supportsPushNotifications,
    supportsAPNs,
  };
}

/**
 * Vérifie si l'appareil supporte les notifications push
 */
export function canReceivePushNotifications(): boolean {
  const platform = detectPlatform();
  return platform.supportsPushNotifications;
}

/**
 * Vérifie si l'appareil est iOS
 */
export function isIOSDevice(): boolean {
  return detectPlatform().isIOS;
}

/**
 * Vérifie si l'appareil est Android
 */
export function isAndroidDevice(): boolean {
  return detectPlatform().isAndroid;
}

/**
 * Vérifie si l'appareil est Desktop
 */
export function isDesktopDevice(): boolean {
  return detectPlatform().isDesktop;
}

/**
 * Obtient le nom de la plateforme pour les logs
 */
export function getPlatformName(): string {
  const platform = detectPlatform();
  switch (platform.platform) {
    case 'ios':
      return 'iOS (Safari)';
    case 'android':
      return 'Android (Chrome)';
    case 'desktop':
      return 'Desktop';
    default:
      return 'Unknown';
  }
}
