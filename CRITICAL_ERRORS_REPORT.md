# Rapport des Erreurs Critiques - Analyse Complète du Projet

## 🔴 ERREURS CRITIQUES IDENTIFIÉES

### 1. Webhook de retrait obsolète et non sécurisé ⚠️ CRITIQUE

**Fichier:** `src/app/api/webhooks/moncash-withdraw/route.ts`

**Problèmes identifiés:**

1. **Header de signature incorrect**
   - Utilise `x-webhook-signature` au lieu de `x-mcc-signature` (conforme documentation MonCashConnect)
   - Cela signifie que ce webhook ne fonctionnera pas avec la nouvelle API MonCashConnect

2. **Pas de vérification de timestamp**
   - La documentation MonCashConnect exige une vérification du timestamp (max 5 minutes)
   - Ce webhook n'a pas cette vérification, ce qui le rend vulnérable aux attaques de rejeu

3. **Pas de vérification IP**
   - Contrairement au nouveau webhook `/api/webhooks/moncash/webhook/route.ts`, celui-ci n'a pas de vérification IP

4. **Libération du reservedBalance incorrecte**
   - En cas d'échec, le webhook ne libère pas le `reservedBalance`
   - Cela pourrait bloquer le solde des utilisateurs de manière permanente

5. **Recherche de transaction inefficace**
   - Le code parcourt TOUTES les transactions pour trouver le retrait
   - C'est très inefficace et pourrait causer des problèmes de performance

**Code problématique:**
```typescript
// Ligne 104 - Header incorrect
const signature = request.headers.get("x-webhook-signature");

// Ligne 48-83 - Pas de vérification de timestamp
function verifySignature(rawBody:string, signature:string) {
  // Pas de vérification de timestamp ici
}

// Ligne 193-241 - Recherche inefficice
const transactions = await adminDB.ref("transactions").once("value");
transactions.forEach((user:any)=>{
  const item = user.child(withdrawalId).val();
  if(item){
    withdrawal = item;
    uid = item.uid;
  }
});
```

**Impact:** ⚠️ CRITIQUE
- Ce webhook ne fonctionnera pas avec la nouvelle API MonCashConnect
- Vulnérable aux attaques de rejeu
- Peut bloquer le solde des utilisateurs
- Problèmes de performance

**Recommandation:** Supprimer ce fichier et utiliser uniquement le nouveau webhook `/api/webhooks/moncash/webhook/route.ts`

---

### 2. API MonCashButton obsolète ⚠️ CRITIQUE

**Fichier:** `src/app/api/wallet/moncash/create/route.ts`

**Problèmes identifiés:**

1. **Utilisation de l'ancienne API MonCashButton**
   - Utilise `https://api.moncashbutton.com/api/v1/CreatePayment`
   - La documentation MonCashConnect utilise `https://api.moncashconnect.com/v1/pay-create`
   - Ces deux API sont différentes et incompatibles

2. **Pas de webhook de confirmation**
   - Cette API n'a pas de webhook de confirmation correspondant
   - Les dépôts créés via cette API ne seront jamais confirmés automatiquement

3. **Pas de Idempotency-Key**
   - N'envoie pas l'en-tête `Idempotency-Key`
   - Vulnérable aux doublons en cas de retry

**Code problématique:**
```typescript
// Ligne 171 - API obsolète
const response = await fetch(
  "https://api.moncashbutton.com/api/v1/CreatePayment",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicKey}`,
    },
    body: JSON.stringify(paymentData),
  }
);
```

**Impact:** ⚠️ CRITIQUE
- Cette API ne fonctionne pas avec la nouvelle documentation MonCashConnect
- Les dépôts créés via cette API ne seront jamais confirmés
- Perte d'argent potentielle

**Recommandation:** Supprimer ce fichier et utiliser uniquement `/api/wallet/deposit/route.ts` avec `createAtomicDeposit`

---

### 3. Librairie MonCash sans Idempotency-Key ⚠️ MOYEN

**Fichier:** `src/lib/moncash.ts`

**Problèmes identifiés:**

1. **Pas d'Idempotency-Key pour createMonCashPayout**
   - La fonction `createMonCashPayout` n'envoie pas l'en-tête `Idempotency-Key`
   - Cela pourrait créer des doublons en cas de retry

**Code problématique:**
```typescript
// Ligne 167-207 - Pas d'Idempotency-Key
const response = await fetch(
  `${BASE_URL}/payout-create`,
  {
    method:"POST",
    headers:{
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
      // Manque: "Idempotency-Key": referenceId
    },
    body:JSON.stringify({
      amount,
      moncashNumber:number,
      referenceId
    })
  }
);
```

**Impact:** ⚠️ MOYEN
- Pourrait créer des doublons de retraits en cas de retry
- Perte d'argent potentielle

**Recommandation:** Ajouter l'en-tête `Idempotency-Key` comme dans `moncashWithdrawAtomic.ts`

---

### 4. Fichiers dupliqués ⚠️ MOYEN

**Problèmes identifiés:**

1. **Deux systèmes de dépôt en parallèle**
   - `/api/wallet/deposit/route.ts` (nouveau système avec MonCashConnect)
   - `/api/wallet/deposit/atomic/route.ts` (nouveau système avec MonCashConnect)
   - `/api/wallet/moncash/create/route.ts` (ancien système avec MonCashButton)

2. **Deux systèmes de retrait en parallèle**
   - `/api/wallet/withdraw/route.ts` (nouveau système avec MonCashConnect)
   - `/api/wallet/withdraw/atomic/route.ts` (nouveau système avec MonCashConnect)
   - `/api/webhooks/moncash-withdraw/route.ts` (ancien webhook)

3. **Deux webhooks en parallèle**
   - `/api/webhooks/moncash/webhook/route.ts` (nouveau webhook conforme)
   - `/api/webhooks/moncash-withdraw/route.ts` (ancien webhook non conforme)

**Impact:** ⚠️ MOYEN
- Confusion sur quel système utiliser
- Risque d'utiliser l'ancien système non sécurisé
- Maintenance difficile

**Recommandation:** Supprimer les anciens fichiers et garder uniquement les nouveaux conformes

---

## 📊 Résumé des Erreurs

| Erreur | Sévérité | Impact | Fichier |
|--------|----------|--------|---------|
| Webhook obsolète | 🔴 CRITIQUE | Fonctionnalité + Sécurité | `moncash-withdraw/route.ts` |
| API MonCashButton obsolète | 🔴 CRITIQUE | Fonctionnalité + Perte d'argent | `moncash/create/route.ts` |
| Pas d'Idempotency-Key | 🟡 MOYEN | Doublons potentiels | `moncash.ts` |
| Fichiers dupliqués | 🟡 MOYEN | Confusion + Maintenance | Plusieurs fichiers |

---

## ✅ Actions Recommandées (Par ordre de priorité)

### 1. IMMÉDIAT (Faire maintenant)

**Supprimer les fichiers obsolètes:**
```bash
# Supprimer l'ancien webhook non sécurisé
rm src/app/api/webhooks/moncash-withdraw/route.ts

# Supprimer l'ancienne API MonCashButton
rm src/app/api/wallet/moncash/create/route.ts
```

### 2. IMPORTANT (Faire dans les 24h)

**Corriger la librairie MonCash:**
```typescript
// Dans src/lib/moncash.ts, ligne 167-207
const response = await fetch(
  `${BASE_URL}/payout-create`,
  {
    method:"POST",
    headers:{
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": referenceId  // AJOUTER CECI
    },
    body:JSON.stringify({
      amount,
      moncashNumber:number,
      referenceId
    })
  }
);
```

### 3. RECOMMANDÉ (Faire cette semaine)

**Nettoyer les fichiers dupliqués:**
- Garder uniquement `/api/wallet/deposit/route.ts` (supprimer `/api/wallet/deposit/atomic/route.ts`)
- Garder uniquement `/api/wallet/withdraw/route.ts` (supprimer `/api/wallet/withdraw/atomic/route.ts`)
- Garder uniquement `/api/webhooks/moncash/webhook/route.ts` (déjà supprimé)

---

## 🎯 Conclusion

**2 erreurs critiques identifiées:**
1. Webhook de retrait obsolète et non sécurisé
2. API MonCashButton obsolète

**1 erreur moyenne identifiée:**
1. Pas d'Idempotency-Key dans la librairie MonCash

**1 problème de structure identifié:**
1. Fichiers dupliqués causant de la confusion

**Action immédiate requise:** Supprimer les fichiers obsolètes pour éviter toute confusion et perte d'argent potentielle.

**Note:** Les fichiers conformes à la documentation MonCashConnect (`moncashAtomic.ts`, `moncashWithdrawAtomic.ts`, `/api/webhooks/moncash/webhook/route.ts`) sont corrects et sécurisés.
