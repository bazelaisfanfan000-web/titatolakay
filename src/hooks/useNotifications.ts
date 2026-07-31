"use client";

import { useEffect, useState } from 'react';
import { messaging, getToken } from '@/lib/firebase';

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      // Vérifier si le navigateur supporte les notifications
      if (!('Notification' in window)) {
        console.log('Ce navigateur ne supporte pas les notifications');
        return;
      }

      // Vérifier si messaging est disponible
      if (!messaging) {
        console.log('Firebase Messaging non disponible');
        return;
      }

      // Demander la permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        console.log('Permission de notification accordée');

        // Obtenir le token FCM
        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });
        
        if (fcmToken) {
          setToken(fcmToken);
          console.log('Token FCM obtenu:', fcmToken);

          // Envoyer le token au serveur
          const userToken = localStorage.getItem('firebaseToken');
          if (userToken) {
            try {
              await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({ token: fcmToken }),
              });
              console.log('Token FCM enregistré sur le serveur');
            } catch (error) {
              console.error('Erreur enregistrement token:', error);
            }

            // S'abonner au topic "new-games"
            try {
              await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({ topic: 'new-games' }),
              });
              console.log('Abonné au topic new-games');
            } catch (error) {
              console.error('Erreur abonnement topic:', error);
            }
          }
        } else {
          console.log('Impossible d\'obtenir le token FCM');
        }
      } else {
        console.log('Permission de notification refusée');
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  return { token, permission };
}
