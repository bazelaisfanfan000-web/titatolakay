# Implémentation des Notifications Firebase Topics (Site Web)

## 📋 Vue d'ensemble

Pour optimiser les notifications quand une partie est créée sur votre **site web**, nous avons implémenté **Firebase Cloud Messaging (FCM) Topics**. Cela permet d'envoyer une seule notification à tous les utilisateurs abonnés.

## ⚠️ Limitations importantes pour le web

**Les notifications web fonctionnent quand:**
- ✅ Le navigateur est ouvert (en premier plan ou en arrière-plan)
- ✅ Le navigateur est fermé mais l'ordinateur est allumé (via Service Worker)

**Les notifications web NE fonctionnent PAS quand:**
- ❌ L'ordinateur est éteint
- ❌ Le navigateur n'a jamais été ouvert sur ce site
- ❌ L'utilisateur a désactivé les notifications

**Pour les notifications quand l'ordinateur est éteint:** Vous auriez besoin d'une app mobile native (iOS/Android).

## 🎯 Pourquoi cette solution ?

### Problème précédent:
- Le système récupérait TOUS les utilisateurs et envoyait des notifications individuelles
- Avec 1000 utilisateurs = 1000 requêtes FCM
- Très lent et coûteux en ressources

### Solution avec Topics:
- Une seule requête FCM au topic "new-games"
- Tous les utilisateurs abonnés reçoivent la notification
- Performance optimale même avec des millions d'utilisateurs

## 🔧 Implémentation Côté Client (Site Web)

### 1. Installer Firebase Messaging SDK

```bash
npm install firebase
```

### 2. Initialiser Firebase Messaging

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
```

### 3. Demander la permission et obtenir le token FCM

```typescript
// src/hooks/useNotifications.ts
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
      // Demander la permission de notification
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Obtenir le token FCM
        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });
        
        setToken(fcmToken);

        // Envoyer le token au serveur pour l'enregistrer
        await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ token: fcmToken }),
        });

        // S'abonner au topic "new-games" via l'API serveur
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ topic: 'new-games' }),
        });

        console.log('Notifications activées et abonné au topic new-games');
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  return { token, permission };
}
```

### 4. Gérer les notifications en premier plan

```typescript
// src/hooks/useForegroundNotifications.ts
import { useEffect } from 'react';
import { messaging, onMessage } from '@/lib/firebase';

export function useForegroundNotifications() {
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Notification reçue en premier plan:', payload);

      // Afficher une notification dans le navigateur
      if (payload.notification) {
        new Notification(payload.notification.title || 'Nouvelle partie', {
          body: payload.notification.body,
          icon: '/icon.png',
          data: payload.data,
        });
      }

      // Naviguer vers la partie si l'utilisateur clique
      if (payload.data?.roomId) {
        window.location.href = `/join/${payload.data.roomId}`;
      }
    });

    return () => unsubscribe();
  }, []);
}
```

### 5. Service Worker pour notifications en arrière-plan

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Notification reçue en arrière-plan:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const roomId = event.notification.data?.roomId;
  if (roomId) {
    event.waitUntil(
      clients.openWindow(`/join/${roomId}`)
    );
  }
});
```

### 6. Enregistrer le Service Worker

```typescript
// src/app/layout.tsx
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

### 7. Utilisation dans votre page principale

```typescript
// src/app/page.tsx
import { useNotifications } from '@/hooks/useNotifications';
import { useForegroundNotifications } from '@/hooks/useForegroundNotifications';

export default function HomePage() {
  useNotifications();
  useForegroundNotifications();

  return (
    <div>
      <h1>TiTaTo</h1>
      {/* Votre site web */}
    </div>
  );
}
```

## 🔧 API Disponibles

### S'abonner aux notifications
```http
POST /api/notifications/subscribe
Content-Type: application/json
Authorization: Bearer <firebase_token>

{
  "topic": "new-games"
}
```

### Se désabonner des notifications
```http
POST /api/notifications/unsubscribe
Content-Type: application/json
Authorization: Bearer <firebase_token>

{
  "topic": "new-games"
}
```

## 🎯 Topics Disponibles

- **new-games**: Notifications quand une nouvelle partie est créée
- **all-games**: Notifications pour toutes les activités de jeux
- **high-stakes**: Notifications pour les parties avec mises élevées (>1000 HTG)

## ⚠️ Points Importants pour le Web

1. **Permission requise**: L'utilisateur doit accepter les notifications dans le navigateur
2. **VAPID Key**: Requise pour les notifications web (générée dans Firebase Console)
3. **Service Worker**: Obligatoire pour les notifications quand le navigateur est en arrière-plan
4. **HTTPS**: Requis pour les notifications web (sauf localhost)
5. **Navigateur fermé**: Les notifications fonctionnent si le navigateur est fermé mais l'ordinateur allumé (via Service Worker)
6. **Ordinateur éteint**: Les notifications NE fonctionnent PAS si l'ordinateur est éteint

## 🚀 Déploiement

1. Ajouter les variables d'environnement dans `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=xxx
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
   NEXT_PUBLIC_FIREBASE_APP_ID=xxx
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=xxx
   ```

2. Placer le service worker dans `public/firebase-messaging-sw.js`

3. Tester sur HTTPS (ou localhost en développement)

4. Déployer sur un serveur avec HTTPS (Vercel, Netlify, etc.)

## 📊 Performance

| Méthode | 1000 utilisateurs | 10,000 utilisateurs |
|---------|------------------|-------------------|
| Ancienne méthode | 1000 requêtes FCM | 10,000 requêtes FCM |
| Topics | 1 requête FCM | 1 requête FCM |

**Amélioration**: 1000x plus performant avec beaucoup d'utilisateurs !

## 🔧 API pour enregistrer le token FCM

Vous devez créer cette API pour enregistrer le token FCM côté serveur:

```typescript
// src/app/api/notifications/register-token/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: "Token requis" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Token manquant" }, { status: 401 });
    }

    const firebaseToken = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(firebaseToken);
    const uid = decoded.uid;

    // Enregistrer le token FCM
    const tokenKey = Buffer.from(token).toString("base64url").replace(/[.#$[\]]/g, "_");
    await adminDB.ref(`users/${uid}/fcmTokens/${tokenKey}`).set({
      token,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur enregistrement token:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
```
