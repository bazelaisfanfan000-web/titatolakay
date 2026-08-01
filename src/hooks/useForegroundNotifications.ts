"use client";

import { useEffect } from 'react';
import { messaging, onMessage } from '@/lib/firebase';

export function useForegroundNotifications() {
  useEffect(() => {
    if (!messaging) {
      console.log('Firebase Messaging non disponible');
      return;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Notification reçue en premier plan:', payload);

      // Afficher la notification dans le navigateur
      if (payload.notification) {
        const notificationTitle = payload.notification.title || 'WinCash';
        const notificationOptions = {
          body: payload.notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: payload.data,
          tag: payload.data?.roomId || 'general',
        };

        // Afficher la notification
        try {
          new Notification(notificationTitle, notificationOptions);
        } catch (error) {
          console.error('Erreur affichage notification:', error);
        }
      }

      // Rediriger si l'utilisateur clique sur la notification
      if (payload.data?.roomId) {
        console.log('Redirection vers la partie:', payload.data.roomId);
        window.location.href = `/join/${payload.data.roomId}`;
      }
    });

    return () => unsubscribe();
  }, []);
}
