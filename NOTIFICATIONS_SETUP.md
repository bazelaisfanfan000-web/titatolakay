# Configuration des Notifications WinCash

## 📋 Vue d'ensemble

Les notifications fonctionnent même si l'utilisateur ferme le navigateur (via Service Worker).

## 🎯 Format de notification

Quand une partie est créée, les utilisateurs reçoivent:

```
🎮 WinCash

🔥 Fanfan vient de créer une partie !
💰 Mise : 100 HTG

Touchez pour rejoindre la partie.
```

## 🔧 Implémentation Côté Client (Simple)

### 1. Installer Firebase

```bash
npm install firebase
```

### 2. Créer `src/lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCwkDm3s9LAXkWWbpVZpRMMHrTYzYyxyGA",
  authDomain: "titato-64a4d.firebaseapp.com",
  projectId: "titato-64a4d",
  storageBucket: "titato-64a4d.firebasestorage.app",
  messagingSenderId: "942632105982",
  appId: "1:942632105982:web:7ebb5b9a19b5c8d0feb2af",
  measurementId: "G-NKBRW72RSH",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
```

### 3. Créer `src/hooks/useNotifications.ts`

```typescript
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
      // Demander la permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Obtenir le token FCM
        const fcmToken = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE',
        });
        
        setToken(fcmToken);

        // Envoyer le token au serveur
        const userToken = localStorage.getItem('firebaseToken');
        await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
          body: JSON.stringify({ token: fcmToken }),
        });

        // S'abonner au topic
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
          body: JSON.stringify({ topic: 'new-games' }),
        });

        console.log('Notifications activées !');
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  return { token, permission };
}
```

### 4. Créer `src/hooks/useForegroundNotifications.ts`

```typescript
import { useEffect } from 'react';
import { messaging, onMessage } from '@/lib/firebase';

export function useForegroundNotifications() {
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Notification reçue:', payload);

      // Afficher la notification
      if (payload.notification) {
        new Notification(payload.notification.title || 'WinCash', {
          body: payload.notification.body,
          icon: '/icon-192.png',
          data: payload.data,
        });
      }

      // Rediriger si l'utilisateur clique
      if (payload.data?.roomId) {
        window.location.href = `/join/${payload.data.roomId}`;
      }
    });

    return () => unsubscribe();
  }, []);
}
```

### 5. Ajouter dans votre page principale

```typescript
// src/app/page.tsx
import { useNotifications } from '@/hooks/useNotifications';
import { useForegroundNotifications } from '@/hooks/useForegroundNotifications';

export default function HomePage() {
  useNotifications();
  useForegroundNotifications();

  return (
    <div>
      <h1>WinCash</h1>
      {/* Votre site */}
    </div>
  );
}
```

### 6. Enregistrer le Service Worker (déjà fait !)

Le Service Worker existe déjà dans `public/firebase-messaging-sw.js`. Il gère:
- ✅ Notifications quand le navigateur est fermé
- ✅ Redirection vers `/join/{roomId}` quand on clique
- ✅ Affichage du bon format de notification

### 7. Ajouter dans `src/app/layout.tsx`

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré:', registration);
      })
      .catch((error) => {
        console.error('Erreur Service Worker:', error);
      });
  }
}, []);
```

## 🔑 Obtenir la VAPID Key

1. Allez dans Firebase Console
2. Project Settings > Cloud Messaging
3. Copiez la "Web Push certificates key pair"
4. Ajoutez-la dans votre code

## ⚠️ Important

- **HTTPS requis** pour les notifications (sauf localhost)
- **Permission requise**: L'utilisateur doit accepter les notifications
- **Navigateur fermé**: Les notifications fonctionnent via Service Worker
- **Ordinateur éteint**: Les notifications NE fonctionnent PAS

## 📊 Résultat

Quand une partie est créée:
1. Notification envoyée instantanément à tous les utilisateurs abonnés
2. Format: "🎮 WinCash" avec le nom du créateur et la mise
3. Clic sur la notification → Redirection vers `/join/{roomId}`
4. Fonctionne même si le navigateur est fermé
