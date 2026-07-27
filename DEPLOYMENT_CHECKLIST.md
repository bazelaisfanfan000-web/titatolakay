# TiTaTo Financial System Refactor - Deployment Checklist

## Pré-déploiement

### 1. Sauvegardes
- [ ] Sauvegarder la base de données Firebase complète
- [ ] Sauvegarder les logs des transactions récentes
- [ ] Documenter l'état actuel des balances utilisateurs
- [ ] Créer un snapshot de l'environnement de production

### 2. Tests en Staging
- [ ] Déployer tous les fichiers modifiés en staging
- [ ] Exécuter les tests unitaires existants
- [ ] Tester manuellement le flux de dépôt
- [ ] Tester manuellement le flux de mise
- [ ] Tester manuellement le flux de gain
- [ ] Tester manuellement le flux de retrait
- [ ] Tester le webhook MonCashConnect
- [ ] Vérifier l'idempotence de payWinner
- [ ] Vérifier l'idempotence des withdrawals
- [ ] Tester le script de réconciliation

### 3. Migration des données
- [ ] Migrer tous les `locked` vers `reservedBalance`
- [ ] Vérifier la cohérence après migration
- [ ] Nettoyer les réservations orphelines
- [ ] Valider les soldes utilisateurs

## Déploiement

### 4. Mise à jour du code
- [ ] Déployer `src/lib/walletLedger.ts` (modifié)
- [ ] Déployer `src/lib/wallet.ts` (modifié)
- [ ] Déployer `src/lib/wallet/wallet/payWinner.ts` (modifié)
- [ ] Déployer `src/lib/wallet/lockBet.ts` (modifié)
- [ ] Déployer `src/lib/financial-reconciliation.ts` (nouveau)
- [ ] Déployer `src/lib/withdrawals/atomic.ts` (déjà corrigé)
- [ ] Vérifier que tous les fichiers sont déployés

### 5. Configuration
- [ ] Vérifier les variables d'environnement MonCashConnect
- [ ] Vérifier le secret webhook
- [ ] Vérifier les limites de retrait
- [ ] Vérifier les taux de frais

## Post-déploiement

### 6. Validation immédiate
- [ ] Exécuter le script de réconciliation (mode dry-run)
- [ ] Vérifier qu'aucune incohérence critique n'est détectée
- [ ] Surveiller les logs d'erreurs pendant 1 heure
- [ ] Vérifier que les withdrawals en cours sont traités
- [ ] Vérifier que les webhooks sont reçus

### 7. Surveillance continue
- [ ] Surveiller les erreurs de transaction pendant 24h
- [ ] Surveiller les timeouts MonCashConnect
- [ ] Vérifier les soldes utilisateurs aléatoirement
- [ ] Surveiller les réservations orphelines
- [ ] Vérifier la cohérence balance vs ledger

### 8. Réconciliation planifiée
- [ ] Exécuter la réconciliation automatique quotidienne
- [ ] Configurer les alertes pour les incohérences détectées
- [ ] Vérifier les rapports de réconciliation
- [ ] Corriger manuellement les incohérences si nécessaire

## Rollback Plan

### 9. Conditions de rollback
- [ ] Définir les critères d'échec (ex: >10 erreurs/heure)
- [ ] Préparer le script de rollback de données
- [ ] Préparer le rollback du code
- [ ] Documenter la procédure de rollback

### 10. Exécution du rollback
- [ ] Restaurer la sauvegarde de la base de données
- [ ] Redéployer l'ancien code
- [ ] Redémarrer les serveurs
- [ ] Valider que le système fonctionne

## Documentation

### 11. Mise à jour de la documentation
- [ ] Mettre à jour l'architecture financière
- [ ] Documenter le nouveau modèle comptable
- [ ] Documenter le script de réconciliation
- [ ] Mettre à jour les guides de dépannage
- [ ] Former l'équipe support

### 12. Communication
- [ ] Informer l'équipe technique
- [ ] Informer l'équipe support
- [ ] Préparer les FAQs pour les utilisateurs
- [ ] Communiquer sur les changements si nécessaire

## Validation finale

### 13. Tests de validation
- [ ] Test complet du flux dépôt → mise → gain → retrait
- [ ] Test de crash recovery (simuler un crash)
- [ ] Test de race condition (appels simultanés)
- [ ] Test d'idempotence (répéter les mêmes opérations)
- [ ] Test de réconciliation (exécuter le script complet)

### 14. Sign-off
- [ ] Validation par l'architecte système
- [ ] Validation par l'équipe sécurité
- [ ] Validation par l'équipe finance
- [ ] Approbation finale du déploiement

## Notes importantes

- **Balance est la source de vérité financière**
- **Ledger est un journal comptable secondaire**
- **reservedBalance unifié pour mises et retraits**
- **availableBalance = balance - reservedBalance**
- **payWinner nécessite un roomId pour l'idempotence**
- **Le script de réconciliation doit être exécuté quotidiennement**
- **Toute incohérence critique doit être corrigée immédiatement**

## Contacts d'urgence

- **Lead Developer**: [Contact]
- **Database Admin**: [Contact]
- **Finance Team**: [Contact]
- **Support Team**: [Contact]

---

**Date de déploiement prévue**: [À remplir]
**Responsable du déploiement**: [À remplir]
**Statut**: [En attente / En cours / Complété]
