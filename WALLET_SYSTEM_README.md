# Système de Wallet Atomique - PlayToWin

## Vue d'ensemble

Système bancaire de niveau production pour gérer les dépôts et retraits MonCash avec des garanties d'atomicité, d'idempotence et de sécurité.

## Architecture

### Composants Principaux

```
src/
├── types/
│   └── wallet.ts              # Types TypeScript
├── lib/
│   ├── moncash.ts            # Client API MonCashConnect
│   ├── wallet.ts             # Gestion wallet Firebase
│   ├── ledger.ts             # Ledger immuable
│   ├── atomicTransaction.ts  # Transactions atomiques
│   └── deduplication.ts      # Anti-replay et déduplication
└── app/api/
    ├── wallet/
    │   ├── deposit/
    │   │   ├── route.ts      # POST /api/wallet/deposit
    │   │   └── status/
    │   │       └── route.ts  # GET /api/wallet/deposit/status
    │   └── withdraw/
    │       └── route.ts      # POST /api/wallet/withdraw
    └── webhooks/
        └── moncash/
            └── route.ts      # POST /api/webhooks/moncash
```

## Configuration

### Variables d'Environnement

Ajoutez ces variables à votre fichier `.env.local`:

```bash
# MonCashConnect API
MONCASHCONNECT_SECRET_KEY=sk_proj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONCASH_API_URL=https://api.moncashconnect.com/v1
MONCASH_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Application
NEXT_PUBLIC_APP_URL=https://votre-application.com
```

### Firebase Realtime Database Structure

```
{
  "users": {
    "userId": {
      "balance": 1000,
      "lockedBalance": 0,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  },
  "deposits": {
    "userId": {
      "depositId": {
        "id": "depositId",
        "userId": "userId",
        "amount": 500,
        "status": "completed",
        "referenceId": "deposit_1234567890_abc123",
        "paymentUrl": "https://pay.moncashconnect.com/c/...",
        "moncashReference": "order_12345",
        "moncashTransactionId": "MC-123456789",
        "netAmount": 485,
        "idempotencyKey": "idemp_1234567890_...",
        "createdAt": 1234567890,
        "completedAt": 1234567890
      }
    }
  },
  "withdrawals": {
    "userId": {
      "withdrawalId": {
        "id": "withdrawalId",
        "userId": "userId",
        "amount": 500,
        "moncashNumber": "50912345678",
        "status": "completed",
        "referenceId": "withdraw_1234567890_abc123",
        "moncashReference": "wd_123",
        "fee": 25,
        "netAmount": 500,
        "recipientAccountMasked": "509****1234",
        "idempotencyKey": "idemp_1234567890_...",
        "createdAt": 1234567890,
        "completedAt": 1234567890
      }
    }
  },
  "wallet_transactions": {
    "userId": {
      "transactionId": {
        "id": "transactionId",
        "userId": "userId",
        "type": "deposit",
        "amount": 500,
        "balanceBefore": 500,
        "balanceAfter": 1000,
        "referenceId": "deposit_1234567890_abc123",
        "status": "completed",
        "source": "moncash",
        "description": "Dépôt MonCash",
        "metadata": {},
        "createdAt": 1234567890,
        "completedAt": 1234567890
      }
    }
  },
  "processed_events": {
    "eventId": {
      "eventId": "payment.completed_order_12345_1234567890",
      "eventType": "payment.completed",
      "reference": "order_12345",
      "userId": "userId",
      "processedAt": 1234567890
    }
  },
  "locks": {
    "lockKey": {
      "lockId": "1234567890_abc123",
      "acquiredAt": 1234567890,
      "expiresAt": 1234567890
    }
  }
}
```

## Flux de Dépôt

### 1. Création du Dépôt

```
Client → POST /api/wallet/deposit
  ↓
Vérification Auth Firebase
  ↓
Validation montant (25-10000 HTG)
  ↓
Génération referenceId unique
  ↓
Génération Idempotency-Key
  ↓
Vérification déduplication
  ↓
Appel POST /pay-create MonCash
  ↓
Sauvegarde dépôt status=pending
  ↓
Retour paymentUrl
  ↓
Client redirigé vers MonCash
```

### 2. Webhook payment.completed

```
MonCash → POST /api/webhooks/moncash
  ↓
Vérification signature HMAC-SHA256
  ↓
Vérification timestamp (<5 min)
  ↓
Vérification déduplication (processed_events)
  ↓
Marquer événement comme traité
  ↓
Trouver dépôt par reference
  ↓
SI status != completed ALORS
  ↓
  Créditer wallet (transaction atomique)
  ↓
  Mettre à jour dépôt status=completed
  ↓
  Créer entrée ledger
  ↓
FIN
```

## Flux de Retrait

### 1. Création du Retrait

```
Client → POST /api/wallet/withdraw
  ↓
Vérification Auth Firebase
  ↓
Validation montant (100-10000 HTG)
  ↓
Validation numéro MonCash (8 chiffres)
  ↓
Vérification solde disponible
  ↓
Vérification aucun retrait en cours
  ↓
Génération referenceId unique
  ↓
Génération Idempotency-Key
  ↓
Verrouiller montant (lockBalance)
  ↓
Sauvegarde retrait status=pending
  ↓
Appel POST /payout-create MonCash
  ↓
Mettre à jour retrait status=queued
  ↓
Retourner confirmation
```

### 2. Webhook payout.completed

```
MonCash → POST /api/webhooks/moncash
  ↓
Vérification signature HMAC-SHA256
  ↓
Vérification timestamp (<5 min)
  ↓
Vérification déduplication
  ↓
Marquer événement comme traité
  ↓
Trouver retrait par reference
  ↓
SI status != completed ALORS
  ↓
  Confirmer retrait (débit + déverrouillage)
  ↓
  Mettre à jour retrait status=completed
  ↓
  Créer entrée ledger
  ↓
FIN
```

### 3. Webhook payout.failed

```
MonCash → POST /api/webhooks/moncash
  ↓
Vérifications (comme payout.completed)
  ↓
Trouver retrait par reference
  ↓
SI status != failed ALORS
  ↓
  Annuler retrait (déverrouillage sans débit)
  ↓
  Mettre à jour retrait status=failed
  ↓
FIN
```

## Sécurité

### ✅ Garanties Implémentées

- **Atomicité**: Toutes les modifications de solde utilisent des transactions Firebase
- **Idempotence**: Idempotency-Key pour les appels API MonCash
- **Anti-replay**: Vérification HMAC-SHA256 + timestamp + déduplication des événements
- **Double spending protection**: Verrouillage des montants pour les retraits
- **Double webhook protection**: Collection processed_events pour éviter les doublons
- **Race condition protection**: Locks distribués Firebase
- **Audit complet**: Ledger immuable de toutes les transactions
- **Rollback automatique**: En cas d'erreur, les transactions sont annulées

### Validation des Données

- Montant minimum/maximum pour dépôts et retraits
- Format du numéro MonCash (8 chiffres)
- Vérification du solde avant transaction
- Validation des clés API (doit commencer par sk_proj_)
- Timestamp max 5 minutes pour les webhooks

## API Endpoints

### POST /api/wallet/deposit

Crée un nouveau dépôt MonCash.

**Request Body:**
```json
{
  "amount": 500,
  "returnUrl": "https://votre-app.com/wallet",
  "customerName": "Jean Dupont",
  "customerEmail": "jean@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "depositId": "deposit_1234567890_abc123",
  "paymentUrl": "https://pay.moncashconnect.com/c/...",
  "referenceId": "order_12345",
  "expiresAt": "2026-05-05T15:30:00.000Z"
}
```

### GET /api/wallet/deposit/status?referenceId=xxx

Vérifie le statut d'un dépôt.

**Response:**
```json
{
  "success": true,
  "deposit": {
    "id": "deposit_1234567890_abc123",
    "amount": 500,
    "status": "completed",
    "referenceId": "order_12345",
    "completedAt": 1234567890,
    "netAmount": 485
  }
}
```

### POST /api/wallet/withdraw

Crée un nouveau retrait MonCash.

**Request Body:**
```json
{
  "amount": 500,
  "moncashNumber": "50912345678"
}
```

**Response:**
```json
{
  "success": true,
  "withdrawalId": "withdraw_1234567890_abc123",
  "referenceId": "wd_123",
  "status": "queued",
  "amount": 5000,
  "fee": 250,
  "recipientAccountMasked": "509****1234"
}
```

### POST /api/webhooks/moncash

Webhook MonCashConnect pour les événements de paiement.

**Headers:**
- `X-MCC-Signature`: sha256=...
- `X-MCC-Timestamp`: Unix timestamp

**Body:**
```json
{
  "event": "payment.completed",
  "reference": "order_12345",
  "amount": 500,
  "status": "completed",
  "completedAt": "2026-05-05T14:21:18.000Z"
}
```

## Tests

### Test de Dépôt

```bash
curl -X POST https://votre-app.com/api/wallet/deposit \
  -H "Authorization: Bearer FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "customerName": "Test User"
  }'
```

### Test de Retrait

```bash
curl -X POST https://votre-app.com/api/wallet/withdraw \
  -H "Authorization: Bearer FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "moncashNumber": "50912345678"
  }'
```

### Test de Webhook

```bash
curl -X POST https://votre-app.com/api/webhooks/moncash \
  -H "Content-Type: application/json" \
  -H "X-MCC-Signature: sha256=..." \
  -H "X-MCC-Timestamp: 1234567890" \
  -d '{
    "event": "payment.completed",
    "reference": "order_12345",
    "amount": 500,
    "status": "completed",
    "completedAt": "2026-05-05T14:21:18.000Z"
  }'
```

## Monitoring

### Logs Importants

- `[MONCASH]` - Appels API MonCash
- `[WALLET]` - Opérations wallet
- `[LEDGER]` - Opérations ledger
- `[ATOMIC_DEPOSIT]` - Transactions de dépôt
- `[ATOMIC_WITHDRAWAL]` - Transactions de retrait
- `[WEBHOOK]` - Événements webhook
- `[DEDUP]` - Opérations de déduplication
- `[LOCK]` - Opérations de locking

### Alertes à Configurer

- Échec des transactions Firebase
- Erreurs API MonCash (4xx, 5xx)
- Signatures webhook invalides
- Timestamps webhook expirés
- Tentatives de double paiement
- Soldes négatifs (ne devrait jamais arriver)

## Maintenance

### Nettoyage Périodique

Exécuter un cron job pour nettoyer les anciens événements traités:

```typescript
import { cleanupOldProcessedEvents } from '@/lib/deduplication';

// Exécuter quotidiennement
await cleanupOldProcessedEvents();
```

### Surveillance

- Surveiller la taille de `processed_events`
- Surveiller les locks expirés
- Vérifier les transactions en pending depuis > 24h
- Auditer le ledger pour les incohérences

## Dépannage

### Dépôt bloqué en pending

1. Vérifier le statut via GET /api/wallet/deposit/status
2. Si MonCash indique completed, vérifier les logs webhook
3. Si webhook non reçu, vérifier la configuration webhook MonCash
4. Manuellement: appeler le webhook avec les données MonCash

### Retrait bloqué en pending

1. Vérifier si le montant est verrouillé (lockedBalance)
2. Si > 24h, considérer comme échec et déverrouiller
3. Vérifier les logs webhook pour payout.completed/failed

### Erreur signature webhook

1. Vérifier MONCASH_WEBHOOK_SECRET
2. Vérifier que le webhook est configuré dans le dashboard MonCash
3. Vérifier que le corps est lu en raw (pas JSON.parse avant vérification)

## Support

Pour toute question ou problème, consultez:
- Documentation MonCashConnect: https://docs.moncashconnect.com
- Firebase Realtime Database: https://firebase.google.com/docs/database
