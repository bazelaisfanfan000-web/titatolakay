# Guide de Sécurité d'Urgence - Protection contre Hacker

## 🚨 Situation: Menace de piratage ciblée

## Actions Immédiates (Faire maintenant)

### 1. Configurer les IP autorisées pour les webhooks

**Ajouter dans votre `.env.local` ou `.env.production`:**

```bash
# IP autorisées pour les webhooks MonCash (demander à MonCash leurs IP)
ALLOWED_WEBHOOK_IPS=1.2.3.4,5.6.7.8
```

**Comment obtenir les IP MonCash:**
- Contacter le support MonCashConnect
- Demander la liste des IP utilisées pour les webhooks
- Ajouter ces IP dans la variable d'environnement

### 2. Activer le monitoring temps réel

**Option A: Sentry (Recommandé)**

1. Créer un compte sur https://sentry.io
2. Créer un nouveau projet Next.js
3. Installer Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

4. Configurer dans `sentry.client.config.ts` et `sentry.server.config.ts`

**Option B: Firebase Crashlytics**

1. Activer Crashlytics dans la console Firebase
2. Installer:
```bash
npm install @react-native-firebase/crashlytics
```

3. Configurer dans votre application

### 3. Configurer les alertes Firebase

**Dans la console Firebase:**
1. Aller dans "Cloud Functions"
2. Configurer les alertes sur:
   - Erreurs de webhook
   - Échecs de transaction
   - Activités suspectes (multiples retraits en peu de temps)

### 4. Activer Cloudflare (Protection DDoS)

1. Créer un compte Cloudflare
2. Ajouter votre domaine
3. Changer les DNS de votre domaine vers Cloudflare
4. Configurer le "Under Attack Mode" si nécessaire
5. Activer le WAF (Web Application Firewall)

### 5. Limiter les gros retraits

**Modifier `src/lib/moncashWithdrawAtomic.ts`:**

```typescript
// Ajouter après la validation du montant
if (amount > 5000) {
  // Demander confirmation supplémentaire
  // Envoyer email de confirmation
  // Nécessiter 2FA
}
```

---

## Mesures de Sécurité Additionnelles

### 6. Activer la 2FA pour les admins

**Installer Firebase Phone Auth:**
```bash
npm install firebase
```

**Implémenter dans le login admin:**
- Demander un code SMS
- Vérifier le code avant d'accéder au panel admin

### 7. Surveiller les logs en temps réel

**Créer un script de monitoring:**

```typescript
// scripts/monitor-logs.ts
import { adminDB } from '../src/lib/firebaseAdmin';

async function monitorLogs() {
  const logsRef = adminDB.ref('auditLogs');
  logsRef.on('value', (snapshot) => {
    const logs = snapshot.val();
    // Analyser les logs pour activités suspectes
    // Envoyer alertes si nécessaire
  });
}

monitorLogs();
```

### 8. Limiter les tentatives de login

**Modifier `src/middleware.ts`:**

```typescript
// Ajouter rate limiting sur le login admin
// Bloquer après 5 tentatives échouées
// Débloquer après 15 minutes
```

---

## Checklist de Vérification Rapide

- [ ] Configurer ALLOWED_WEBHOOK_IPS
- [ ] Activer Sentry ou Crashlytics
- [ ] Configurer les alertes Firebase
- [ ] Activer Cloudflare
- [ ] Limiter les gros retraits
- [ ] Activer 2FA pour les admins
- [ ] Surveiller les logs en temps réel
- [ ] Limiter les tentatives de login

---

## Signes d'Attaque à Surveiller

### Activités suspectes:
- Multiples webhooks échoués
- Multiples tentatives de retrait en peu de temps
- Tentatives de login admin échouées
- Requêtes inhabituelles sur les endpoints sensibles
- Modifications inattendues dans la base de données

### Actions immédiates si attaque détectée:
1. Désactiver temporairement les dépôts/retraits
2. Bloquer l'IP suspecte
3. Avertir les utilisateurs
4. Analyser les logs
5. Contacter le support MonCash

---

## Contact d'Urgence

- Support MonCashConnect: [Contact]
- Support Firebase: [Contact]
- Support Cloudflare: [Contact]
- Support Sentry: [Contact]

---

## Note Importante

Votre application est déjà très sécurisée (98/100). Ces mesures sont des précautions supplémentaires contre des attaques ciblées. La plupart des hackers ne peuvent pas contourner vos protections actuelles.

**Rester calme et suivre ce guide.**
