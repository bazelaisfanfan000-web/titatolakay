"use client";

import { useEffect, useState, useRef } from 'react';
import { requestNotificationPermission, subscribeToTopic } from '@/lib/firebase-messaging';

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isInitialized = useRef(false);

  useEffect(() => {
    // Éviter l'initialisation multiple
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      // Vérifier si le navigateur supporte les notifications
      if (!('Notification' in window)) {
        console.log('Ce navigateur ne supporte pas les notifications');
        return;
      }

      // Demander la permission et obtenir le token
      const fcmToken = await requestNotificationPermission();
      setPermission(Notification.permission);

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

          // S'abonner au topic "new-games" pour recevoir les notifications de nouvelles parties
          try {
            const subscribeResult = await subscribeToTopic('new-games');
            if (subscribeResult.success) {
              console.log('Abonné au topic new-games avec succès');
            } else {
              console.error('Erreur abonnement topic new-games:', subscribeResult.error);
            }
          } catch (error) {
            console.error('Erreur abonnement topic:', error);
          }
        }
      } else {
        console.log('Impossible d\'obtenir le token FCM');
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  return { token, permission };
}
