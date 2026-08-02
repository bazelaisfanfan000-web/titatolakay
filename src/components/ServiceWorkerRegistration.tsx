"use client";

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (isRegistered || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré avec succès:', registration);
        setIsRegistered(true);
        
        // Vérifier les mises à jour du Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nouveau Service Worker disponible, rechargement...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  }, [isRegistered]);

  return null;
}
