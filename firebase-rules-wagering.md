# Règles de Sécurité Firebase pour le Système Wagering

## Règles Firebase Realtime Database

Ajoutez ces règles à votre fichier `firebase.json` ou dans la console Firebase :

```json
{
  "rules": {
    "users": {
      "$uid": {
        // Lecture : l'utilisateur peut lire ses propres données
        ".read": "auth != null && auth.uid == $uid",
        
        // Écriture : protégée - seul le serveur peut modifier les champs wagering
        ".write": "auth != null && auth.uid == $uid",
        
        // Champs wagering : lecture seule pour le client
        "totalDeposits": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "wageringRequired": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "wageringCompleted": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "withdrawalUnlocked": {
          ".validate": "newData.isBoolean()"
        },
        "wageringUpdatedAt": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        }
      }
    },
    
    // Tracking des mises pour éviter les doublons
    "wagering_tracking": {
      "$uid": {
        "$gameId": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "false" // Uniquement le serveur peut écrire
        }
      }
    },
    
    // Les API routes utilisent Firebase Admin SDK qui contourne les règles de sécurité
    // Les règles ci-dessus protègent contre les modifications directes depuis le client
  }
}
```

## Règles de Sécurité Côté Serveur

Les API routes utilisent Firebase Admin SDK qui contourne les règles de sécurité client. Voici les protections implémentées :

### 1. API /api/wagering/update
- ✅ Vérifie que la partie existe
- ✅ Vérifie que l'utilisateur est dans la partie
- ✅ Empêche le double comptage (wagering_tracking)
- ✅ Utilise des transactions atomiques Firebase
- ✅ Logs de sécurité

### 2. API /api/wagering/check
- ✅ Lecture seule, pas de modification
- ✅ Recalcule wageringRequired à chaque appel
- ✅ Vérifie l'authentification

### 3. API /api/wallet/withdraw
- ✅ Vérifie le wagering avant retrait
- ✅ Bloque le retrait si wagering non complété
- ✅ Retourne la progression actuelle
- ✅ Logs de sécurité

### 4. Webhook MonCash (moncashDeposit.ts)
- ✅ Met à jour totalDeposits et wageringRequired
- ✅ Utilise des transactions atomiques
- ✅ Ne modifie pas wageringCompleted (progression conservée)
- ✅ Logs de sécurité

## Protection Contre la Fraude

### Empêcher les parties fictives
- L'API `/api/wagering/update` vérifie que :
  1. La partie existe dans `games/$gameId`
  2. L'utilisateur est un joueur de cette partie
  3. La mise n'a pas déjà été comptée pour cette partie

### Empêcher les modifications directes
- Les champs wagering sont protégés par les règles Firebase
- Seul le serveur (Admin SDK) peut les modifier
- Le client ne peut pas modifier wageringCompleted directement

### Empêcher les doubles comptages
- `wagering_tracking/$uid/$gameId` stocke les mises déjà comptées
- Si une mise est déjà comptée, l'API retourne une erreur 409

### Transactions Atomiques
- Toutes les modifications utilisent des transactions Firebase
- Empêche les conditions de course
- Garantit la cohérence des données

## Logs de Sécurité

Toutes les opérations wagering sont loggées :
- `[WAGERING]` pour les mises à jour
- `[WAGERING CHECK]` pour les vérifications
- `[WITHDRAW]` pour les tentatives de retrait
- `[MONCASH]` pour les dépôts

## Tests de Sécurité

### Scénario 1 : Tentative de modification directe
```javascript
// Tenter de modifier wageringCompleted depuis le client
await update(ref(db, `users/${uid}/wageringCompleted`), 10000);
// Résultat : Bloqué par les règles Firebase
```

### Scénario 2 : Créer une partie fictive
```javascript
// Tenter de créer une fausse partie pour augmenter wagering
await fetch('/api/wagering/update', {
  method: 'POST',
  body: JSON.stringify({
    userId: uid,
    betAmount: 1000,
    gameId: 'fake_game_id'
  })
});
// Résultat : Erreur 404 - Partie non trouvée
```

### Scénario 3 : Double comptage
```javascript
// Tenter de compter la même mise deux fois
await fetch('/api/wagering/update', { /* ... */ });
await fetch('/api/wagering/update', { /* ... */ }); // Même gameId
// Résultat : Erreur 409 - Mise déjà comptée
```

### Scénario 4 : Retrait sans wagering
```javascript
// Tenter de retirer sans avoir complété le wagering
await fetch('/api/wallet/withdraw', { /* ... */ });
// Résultat : Erreur 403 - Wagering non complété
```

## Recommandations de Déploiement

1. **Activer les règles Firebase** dans la console Firebase
2. **Surveiller les logs** pour détecter les tentatives de fraude
3. **Configurer des alertes** pour les activités suspectes
4. **Tester régulièrement** le système avec différents scénarios
5. **Garder les Admin SDK secrets** sécurisés
