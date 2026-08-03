# Tests du Système Wagering (Playthrough/Rollover)

## Scénarios de Test

### Scénario 1 : Dépôt simple + mise complète
**Objectif** : Vérifier qu'un utilisateur peut retirer après avoir misé 2x son dépôt

**Étapes** :
1. Utilisateur dépose 100 HTG
2. Vérifier que `totalDeposits = 100`, `wageringRequired = 200`, `wageringCompleted = 0`
3. Utilisateur joue une partie avec mise de 100 HTG
4. Appeler `/api/wagering/update` avec `{ userId, betAmount: 100, gameId }`
5. Vérifier que `wageringCompleted = 100`, `progress = 50%`
6. Utilisateur joue une autre partie avec mise de 100 HTG
7. Appeler `/api/wagering/update` avec `{ userId, betAmount: 100, gameId }`
8. Vérifier que `wageringCompleted = 200`, `progress = 100%`, `withdrawalUnlocked = true`
9. Tenter un retrait → doit être autorisé

**Résultat attendu** : ✅ Retrait autorisé après 200 HTG de mises

---

### Scénario 2 : Dépôts multiples
**Objectif** : Vérifier que la progression est conservée lors de nouveaux dépôts

**Étapes** :
1. Utilisateur dépose 100 HTG
2. Vérifier que `totalDeposits = 100`, `wageringRequired = 200`
3. Utilisateur mise 100 HTG
4. Vérifier que `wageringCompleted = 100`, `progress = 50%`
5. Utilisateur dépose encore 100 HTG
6. Vérifier que `totalDeposits = 200`, `wageringRequired = 400`
7. Vérifier que `wageringCompleted = 100` (conservé), `progress = 25%`
8. Tenter un retrait → doit être bloqué
9. Message : "Vous devez encore miser 300 HTG avant de pouvoir retirer (25% complété)"

**Résultat attendu** : ✅ Progression conservée, nouvel objectif calculé

---

### Scénario 3 : Retrait bloqué
**Objectif** : Vérifier que le retrait est bloqué si wagering non complété

**Étapes** :
1. Utilisateur dépose 100 HTG
2. Utilisateur mise 50 HTG
3. Vérifier que `wageringCompleted = 50`, `wageringRequired = 200`, `progress = 25%`
4. Tenter un retrait
5. Vérifier la réponse : `{ success: false, error: "Vous devez encore miser 150 HTG...", wageringBlocked: true }`

**Résultat attendu** : ✅ Retrait bloqué avec message informatif

---

### Scénario 4 : Retrait débloqué
**Objectif** : Vérifier que le retrait est autorisé après wagering complété

**Étapes** :
1. Utilisateur dépose 100 HTG
2. Utilisateur mise 200 HTG (en plusieurs parties)
3. Vérifier que `wageringCompleted = 200`, `wageringRequired = 200`, `progress = 100%`
4. Tenter un retrait
5. Vérifier que le retrait est autorisé

**Résultat attendu** : ✅ Retrait autorisé

---

### Scénario 5 : Aucun dépôt
**Objectif** : Vérifier qu'un utilisateur sans dépôt peut retirer

**Étapes** :
1. Utilisateur sans dépôt (bonus ou autre)
2. Vérifier que `totalDeposits = 0`
3. Tenter un retrait
4. Vérifier que le retrait est autorisé

**Résultat attendu** : ✅ Retrait autorisé (pas de wagering requis)

---

### Scénario 6 : Tentative de fraude - partie fictive
**Objectif** : Vérifier que l'API rejette les mises sur des parties inexistantes

**Étapes** :
1. Tenter d'appeler `/api/wagering/update` avec `{ userId, betAmount: 1000, gameId: "fake_game_id" }`
2. Vérifier la réponse : `{ success: false, message: "Partie non trouvée" }`

**Résultat attendu** : ✅ Erreur 404 - Partie non trouvée

---

### Scénario 7 : Tentative de fraude - double comptage
**Objectif** : Vérifier que l'API empêche le double comptage de mise

**Étapes** :
1. Utilisateur joue une partie avec mise de 100 HTG
2. Appeler `/api/wagering/update` avec `{ userId, betAmount: 100, gameId }`
3. Vérifier que `wageringCompleted = 100`
4. Tenter d'appeler `/api/wagering/update` avec les mêmes paramètres
5. Vérifier la réponse : `{ success: false, message: "Mise déjà comptée pour cette partie" }`

**Résultat attendu** : ✅ Erreur 409 - Mise déjà comptée

---

### Scénario 8 : Tentative de fraude - utilisateur pas dans la partie
**Objectif** : Vérifier que l'API rejette les mises d'utilisateurs non participants

**Étapes** :
1. Créer une partie avec utilisateur A
2. Tenter d'appeler `/api/wagering/update` avec `{ userId: utilisateur_B, betAmount: 100, gameId }`
3. Vérifier la réponse : `{ success: false, message: "Utilisateur n'est pas dans cette partie" }`

**Résultat attendu** : ✅ Erreur 403 - Utilisateur non autorisé

---

## Commandes de Test

### Test API Wagering Update
```bash
curl -X POST http://localhost:3000/api/wagering/update \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_id",
    "betAmount": 100,
    "gameId": "test_game_id"
  }'
```

### Test API Wagering Check
```bash
curl http://localhost:3000/api/wagering/check?userId=test_user_id
```

### Test API Withdraw (avec wagering bloqué)
```bash
curl -X POST http://localhost:3000/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase_token>" \
  -d '{
    "amount": 100,
    "moncashNumber": "50931114949"
  }'
```

## Vérification Firebase

### Structure des données utilisateur
```javascript
{
  "balance": 150,
  "totalDeposits": 100,
  "wageringRequired": 200,
  "wageringCompleted": 100,
  "withdrawalUnlocked": false,
  "wageringUpdatedAt": 1691234567890
}
```

### Structure wagering_tracking
```javascript
{
  "wagering_tracking": {
    "user123": {
      "game456": {
        "userId": "user123",
        "gameId": "game456",
        "betAmount": 100,
        "processedAt": 1691234567890
      }
    }
  }
}
```

## Checklist de Déploiement

- [ ] Activer les règles Firebase dans la console
- [ ] Tester tous les scénarios ci-dessus
- [ ] Vérifier les logs de sécurité
- [ ] Configurer les alertes pour activités suspectes
- [ ] Documenter les procédures de support
- [ ] Former l'équipe de support sur le système wagering
- [ ] Surveiller les premiers dépôts et retraits
