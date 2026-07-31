# Système de Revanche - Documentation

## Vue d'ensemble

Le système de revanche permet aux joueurs de demander une revanche après une partie terminée. Toutes les validations sont effectuées côté serveur pour garantir la sécurité.

## Fichiers créés

### 1. Types et interfaces
- **`src/lib/revengeTypes.ts`**
  - Définit les interfaces TypeScript pour les demandes de revanche
  - `RevengeRequest`, `CreateRevengeRequest`, `AcceptRevengeRequest`, `RejectRevengeRequest`

### 2. API Routes (Backend sécurisé)

#### `src/app/api/revenge/request/route.ts`
- **POST /api/revenge/request**
- Crée une demande de revanche
- Validations :
  - Empêche de demander à soi-même
  - Vérifie que la mise est valide (25-10000 HTG)
  - Vérifie que l'ancienne partie existe
  - Empêche les demandes en double
- Sécurité : Rate limiting, CAPTCHA, audit logs

#### `src/app/api/revenge/accept/route.ts`
- **POST /api/revenge/accept**
- Accepte une demande de revanche et crée une nouvelle partie
- Validations côté serveur :
  - Vérifie que l'utilisateur est l'opposant
  - Vérifie que les deux utilisateurs existent
  - Vérifie que les deux joueurs ont un solde suffisant
  - Vérifie que les deux joueurs ne sont pas déjà dans une partie active
  - Verrou pour éviter double acceptation
- Transactions atomiques pour débit des deux joueurs
- Création d'une nouvelle partie indépendante
- Sécurité : Rate limiting, CAPTCHA, audit logs

#### `src/app/api/revenge/reject/route.ts`
- **POST /api/revenge/reject**
- Refuse une demande de revanche
- Validations :
  - Vérifie que l'utilisateur est l'opposant
  - Vérifie que la demande est en attente
- Sécurité : Rate limiting, CAPTCHA, audit logs

### 3. Composants UI

#### `src/components/WinnerModal.tsx` (modifié)
- Ajouté le bouton "Demander une revanche"
- Nouveaux props : `onRequestRevenge`, `roomId`, `gameId`, `opponentId`, `userId`
- Le bouton n'apparaît que si toutes les informations sont disponibles

#### `src/components/RevengeRequestModal.tsx` (nouveau)
- Modal qui s'affiche quand une demande de revanche est reçue
- Écoute en temps réel les demandes via Firebase Realtime Database
- Boutons pour accepter ou refuser
- Design cohérent avec le reste de l'application

### 4. Hooks

#### `src/hooks/useRevenge.ts` (nouveau)
- Hook personnalisé pour gérer les demandes de revanche
- Fonctions : `requestRevenge`, `acceptRevenge`, `rejectRevenge`
- Gestion des états de chargement et d'erreur

### 5. Logs d'audit

#### `src/lib/auditLogger.ts` (modifié)
- Ajouté les actions d'audit pour la revanche :
  - `REVENGE_REQUESTED`
  - `REVENGE_ACCEPTED`
  - `REVENGE_REJECTED`

## Structure Firebase

### `/revengeRequests/{requestId}`
```typescript
{
  requestId: string;
  requesterId: string;      // Joueur qui demande
  opponentId: string;       // Joueur qui reçoit
  previousGameId: string;   // ID de l'ancienne partie
  previousRoomId: string;   // ID de l'ancienne room
  betAmount: number;        // Mise de la revanche
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  createdAt: number;
  respondedAt?: number;
  newRoomId?: string;       // ID de la nouvelle partie (si acceptée)
  lock?: {                  // Verrou pour éviter double acceptation
    locked: boolean;
    lockedAt: number;
  };
}
```

## Intégration dans les pages de jeu

### Étape 1 : Modifier la page de fin de partie

Dans la page qui affiche `WinnerModal`, ajoutez :

```typescript
import { useRevenge } from "@/hooks/useRevenge";
import { useRouter } from "next/navigation";
import RevengeRequestModal from "@/components/RevengeRequestModal";

const { requestRevenge, acceptRevenge, rejectRevenge } = useRevenge();
const router = useRouter();

const handleRequestRevenge = async () => {
  try {
    await requestRevenge(
      opponentId,
      gameId,
      roomId,
      bet
    );
    // Afficher un message de succès
  } catch (error) {
    // Gérer l'erreur
  }
};

const handleAcceptRevenge = async (requestId: string) => {
  try {
    const result = await acceptRevenge(requestId);
    if (result.success) {
      router.push(`/game/waiting/${result.newRoomId}`);
    }
  } catch (error) {
    // Gérer l'erreur
  }
};

const handleRejectRevenge = async (requestId: string) => {
  try {
    await rejectRevenge(requestId);
  } catch (error) {
    // Gérer l'erreur
  }
};
```

### Étape 2 : Passer les props à WinnerModal

```typescript
<WinnerModal
  winner={winner}
  mySymbol={mySymbol}
  reward={reward}
  bet={bet}
  pot={pot}
  commission={commission}
  friendStatus={friendStatus}
  onAddFriend={handleAddFriend}
  onRequestRevenge={handleRequestRevenge}
  onClose={handleClose}
  roomId={roomId}
  gameId={gameId}
  opponentId={opponentId}
  userId={userId}
/>
```

### Étape 3 : Ajouter RevengeRequestModal

```typescript
<RevengeRequestModal
  userId={userId}
  onAccept={handleAcceptRevenge}
  onReject={handleRejectRevenge}
/>
```

## Flux complet

1. **Fin de partie** : Le modal WinnerModal s'affiche avec le bouton "Demander une revanche"
2. **Demande** : Le joueur clique sur "Demander une revanche" → appel à `/api/revenge/request`
3. **Réception** : Si l'adversaire est sur la page, `RevengeRequestModal` s'affiche automatiquement
4. **Acceptation** : L'adversaire accepte → validation serveur → débit atomique → création nouvelle partie
5. **Redirection** : Les deux joueurs sont redirigés vers la nouvelle partie
6. **Refus** : L'adversaire refuse → la demande est marquée comme rejetée

## Sécurité

- ✅ Toutes les validations côté serveur
- ✅ Transactions atomiques Firebase
- ✅ Rate limiting sur tous les endpoints
- ✅ CAPTCHA sur toutes les actions
- ✅ Logs d'audit complets
- ✅ Verrou pour éviter double acceptation
- ✅ Vérification des permissions
- ✅ Empêche les demandes à soi-même
- ✅ Empêche les demandes en double
- ✅ Vérification des soldes avant création
- ✅ Vérification que les joueurs ne sont pas déjà en partie

## Tests à effectuer

1. ✅ Joueur demande une revanche
2. ✅ Adversaire accepte
3. ✅ Adversaire refuse
4. ✅ Adversaire quitte la page (pas de notification)
5. ✅ Deux clics rapides sur accepter (verrou)
6. ✅ Solde insuffisant
7. ✅ Joueur déjà dans une partie
8. ✅ Création d'une seule nouvelle room
9. ✅ Ancienne partie reste intacte
10. ✅ Demande à soi-même (bloqué)
11. ✅ Demande en double (bloqué)

## Notes importantes

- Pas de notification push (comme demandé)
- Pas d'affichage automatique sur le dashboard (comme demandé)
- La revanche crée une NOUVELLE partie indépendante
- L'historique de l'ancienne partie reste intact
- Les transactions wallet sont sécurisées et atomiques
