"use client";

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker enregistré avec succès:', registration);
          
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
    } else {
      console.log('Service Worker non supporté par ce navigateur');
    }
  }, []);

  return null;
}
