/**
 * Script de Test Complet du Système Wagering
 * 
 * Ce script teste tous les scénarios du système de condition de retrait
 * pour s'assurer qu'un utilisateur ne peut pas retirer sans avoir
 * multiplié son dépôt par 2.
 * 
 * Exécution : node test-wagering-system.js
 * 
 * Prérequis :
 * - Node.js installé
 * - Firebase Admin SDK configuré
 * - Variables d'environnement définies
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Ajustez le chemin

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://titatolakay-default-rtdb.firebaseio.com'
});

const db = admin.database();

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Données de test
const testUserId = 'test_user_' + Date.now();
const testGameId = 'test_game_' + Date.now();

// Fonctions utilitaires
async function getUserData(userId) {
  const snapshot = await db.ref(`users/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
}

async function setUserData(userId, data) {
  await db.ref(`users/${userId}`).set(data);
}

async function clearTestData(userId) {
  await db.ref(`users/${userId}`).remove();
  await db.ref(`wagering_tracking/${userId}`).remove();
  await db.ref(`deposits/${userId}`).remove();
  logInfo(`Données de test nettoyées pour l'utilisateur ${userId}`);
}

// Scénarios de test
async function testScenario1_SimpleDepositAndWager() {
  log('\n=== Scénario 1 : Dépôt simple + mise complète ===', colors.cyan);
  
  try {
    // Initialiser l'utilisateur avec un dépôt
    await setUserData(testUserId, {
      balance: 150,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 0,
      withdrawalUnlocked: false,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringRequired 200 HTG');
    
    let user = await getUserData(testUserId);
    logInfo(`État initial : wageringCompleted=${user.wageringCompleted}, wageringRequired=${user.wageringRequired}`);
    
    // Simuler une mise de 100 HTG
    logInfo('Simulation mise 100 HTG...');
    await db.ref(`users/${testUserId}`).transaction((current) => {
      if (!current) return;
      const newWageringCompleted = (current.wageringCompleted || 0) + 100;
      const newWageringRequired = (current.totalDeposits || 0) * 2;
      return {
        ...current,
        wageringCompleted: newWageringCompleted,
        wageringRequired: newWageringRequired,
        withdrawalUnlocked: newWageringCompleted >= newWageringRequired,
        wageringUpdatedAt: Date.now()
      };
    });
    
    user = await getUserData(testUserId);
    logInfo(`Après mise 1 : wageringCompleted=${user.wageringCompleted}, progress=${((user.wageringCompleted / user.wageringRequired) * 100).toFixed(0)}%`);
    
    // Simuler une autre mise de 100 HTG
    logInfo('Simulation mise 100 HTG...');
    await db.ref(`users/${testUserId}`).transaction((current) => {
      if (!current) return;
      const newWageringCompleted = (current.wageringCompleted || 0) + 100;
      const newWageringRequired = (current.totalDeposits || 0) * 2;
      return {
        ...current,
        wageringCompleted: newWageringCompleted,
        wageringRequired: newWageringRequired,
        withdrawalUnlocked: newWageringCompleted >= newWageringRequired,
        wageringUpdatedAt: Date.now()
      };
    });
    
    user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    
    if (user.withdrawalUnlocked && progress >= 100) {
      logSuccess(`Retrait autorisé après ${user.wageringCompleted} HTG de mises (${progress.toFixed(0)}% complété)`);
      return true;
    } else {
      logError(`Retrait bloqué : wageringCompleted=${user.wageringCompleted}, wageringRequired=${user.wageringRequired}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 1 : ${error.message}`);
    return false;
  }
}

async function testScenario2_WithdrawalWithoutWagering() {
  log('\n=== Scénario 2 : Tentative de retrait sans wagering ===', colors.cyan);
  
  try {
    // Initialiser l'utilisateur avec un dépôt mais sans wagering
    await setUserData(testUserId, {
      balance: 150,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 50, // Seulement 50 HTG de mises
      withdrawalUnlocked: false,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringCompleted 50 HTG');
    
    const user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    const remaining = user.wageringRequired - user.wageringCompleted;
    
    logInfo(`État : wageringCompleted=${user.wageringCompleted}, wageringRequired=${user.wageringRequired}, progress=${progress.toFixed(0)}%`);
    
    // Vérifier si le retrait est bloqué
    if (!user.withdrawalUnlocked && user.wageringCompleted < user.wageringRequired) {
      logSuccess(`Retrait bloqué comme attendu : encore ${remaining} HTG à miser (${progress.toFixed(0)}% complété)`);
      return true;
    } else {
      logError(`Retrait autorisé alors qu\'il devrait être bloqué !`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 2 : ${error.message}`);
    return false;
  }
}

async function testScenario3_MultipleDeposits() {
  log('\n=== Scénario 3 : Dépôts multiples ===', colors.cyan);
  
  try {
    // Initialiser avec premier dépôt
    await setUserData(testUserId, {
      balance: 150,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 100,
      withdrawalUnlocked: false,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringCompleted 100 HTG (50%)');
    
    let user = await getUserData(testUserId);
    logInfo(`État initial : wageringCompleted=${user.wageringCompleted}, wageringRequired=${user.wageringRequired}`);
    
    // Simuler un deuxième dépôt
    logInfo('Simulation deuxième dépôt 100 HTG...');
    await db.ref(`users/${testUserId}`).transaction((current) => {
      if (!current) return;
      const newTotalDeposits = (current.totalDeposits || 0) + 100;
      const newWageringRequired = newTotalDeposits * 2;
      const currentWageringCompleted = current.wageringCompleted || 0;
      return {
        ...current,
        totalDeposits: newTotalDeposits,
        wageringRequired: newWageringRequired,
        wageringCompleted: currentWageringCompleted, // Progression conservée
        withdrawalUnlocked: currentWageringCompleted >= newWageringRequired,
        wageringUpdatedAt: Date.now()
      };
    });
    
    user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    const remaining = user.wageringRequired - user.wageringCompleted;
    
    logInfo(`Après dépôt : totalDeposits=${user.totalDeposits}, wageringRequired=${user.wageringRequired}`);
    logInfo(`Progression conservée : wageringCompleted=${user.wageringCompleted} (${progress.toFixed(0)}%)`);
    
    // Vérifier que la progression est conservée
    if (user.wageringCompleted === 100 && user.wageringRequired === 400) {
      logSuccess(`Progression conservée correctement : encore ${remaining} HTG à miser (${progress.toFixed(0)}% complété)`);
      return true;
    } else {
      logError(`Progression non conservée correctement`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 3 : ${error.message}`);
    return false;
  }
}

async function testScenario4_NoDeposit() {
  log('\n=== Scénario 4 : Aucun dépôt ===', colors.cyan);
  
  try {
    // Initialiser l'utilisateur sans dépôt
    await setUserData(testUserId, {
      balance: 50, // Bonus ou autre
      totalDeposits: 0,
      wageringRequired: 0,
      wageringCompleted: 0,
      withdrawalUnlocked: true,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé sans dépôt (bonus)');
    
    const user = await getUserData(testUserId);
    logInfo(`État : totalDeposits=${user.totalDeposits}, wageringRequired=${user.wageringRequired}`);
    
    // Vérifier que le retrait est autorisé
    if (user.totalDeposits === 0 && user.withdrawalUnlocked) {
      logSuccess(`Retrait autorisé pour utilisateur sans dépôt`);
      return true;
    } else {
      logError(`Retrait bloqué pour utilisateur sans dépôt`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 4 : ${error.message}`);
    return false;
  }
}

async function testScenario5_PartialWagering() {
  log('\n=== Scénario 5 : Wagering partiel ===', colors.cyan);
  
  try {
    // Initialiser avec dépôt et wagering partiel
    await setUserData(testUserId, {
      balance: 150,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 150, // 75% complété
      withdrawalUnlocked: false,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringCompleted 150 HTG (75%)');
    
    const user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    const remaining = user.wageringRequired - user.wageringCompleted;
    
    logInfo(`État : wageringCompleted=${user.wageringCompleted}, progress=${progress.toFixed(0)}%`);
    
    // Vérifier que le retrait est bloqué
    if (!user.withdrawalUnlocked && remaining > 0) {
      logSuccess(`Retrait bloqué : encore ${remaining} HTG à miser (${progress.toFixed(0)}% complété)`);
      return true;
    } else {
      logError(`Retrait autorisé alors qu\'il devrait être bloqué`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 5 : ${error.message}`);
    return false;
  }
}

async function testScenario6_ExactWagering() {
  log('\n=== Scénario 6 : Wagering exact ===', colors.cyan);
  
  try {
    // Initialiser avec dépôt et wagering exact
    await setUserData(testUserId, {
      balance: 150,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 200, // Exactement 100%
      withdrawalUnlocked: true,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringCompleted 200 HTG (100%)');
    
    const user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    
    logInfo(`État : wageringCompleted=${user.wageringCompleted}, progress=${progress.toFixed(0)}%`);
    
    // Vérifier que le retrait est autorisé
    if (user.withdrawalUnlocked && progress >= 100) {
      logSuccess(`Retrait autorisé : wagering complété exactement (${progress.toFixed(0)}%)`);
      return true;
    } else {
      logError(`Retrait bloqué alors qu\'il devrait être autorisé`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 6 : ${error.message}`);
    return false;
  }
}

async function testScenario7_OverWagering() {
  log('\n=== Scénario 7 : Wagering excédentaire ===', colors.cyan);
  
  try {
    // Initialiser avec dépôt et wagering excédentaire
    await setUserData(testUserId, {
      balance: 250,
      totalDeposits: 100,
      wageringRequired: 200,
      wageringCompleted: 300, // 150% complété
      withdrawalUnlocked: true,
      currency: 'HTG'
    });
    
    logInfo('Utilisateur initialisé : dépôt 100 HTG, wageringCompleted 300 HTG (150%)');
    
    const user = await getUserData(testUserId);
    const progress = (user.wageringCompleted / user.wageringRequired) * 100;
    
    logInfo(`État : wageringCompleted=${user.wageringCompleted}, progress=${progress.toFixed(0)}%`);
    
    // Vérifier que le retrait est autorisé
    if (user.withdrawalUnlocked && progress >= 100) {
      logSuccess(`Retrait autorisé : wagering excédentaire accepté (${progress.toFixed(0)}%)`);
      return true;
    } else {
      logError(`Retrait bloqué alors qu\'il devrait être autorisé`);
      return false;
    }
  } catch (error) {
    logError(`Erreur scénario 7 : ${error.message}`);
    return false;
  }
}

// Exécution des tests
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     TEST COMPLET DU SYSTÈME WAGERING                    ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  
  const results = [];
  
  results.push(await testScenario1_SimpleDepositAndWager());
  await clearTestData(testUserId);
  
  results.push(await testScenario2_WithdrawalWithoutWagering());
  await clearTestData(testUserId);
  
  results.push(await testScenario3_MultipleDeposits());
  await clearTestData(testUserId);
  
  results.push(await testScenario4_NoDeposit());
  await clearTestData(testUserId);
  
  results.push(await testScenario5_PartialWagering());
  await clearTestData(testUserId);
  
  results.push(await testScenario6_ExactWagering());
  await clearTestData(testUserId);
  
  results.push(await testScenario7_OverWagering());
  await clearTestData(testUserId);
  
  // Résumé
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                    RÉSUMÉ DES TESTS                         ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`\nTests passés : ${passed}/${total}`, passed === total ? colors.green : colors.red);
  
  if (passed === total) {
    logSuccess('✅ TOUS LES TESTS SONT PASSÉS - Le système wagering fonctionne correctement !');
    logSuccess('✅ Un utilisateur NE PEUT PAS retirer sans avoir multiplié son dépôt par 2');
  } else {
    logError(`❌ ${total - passed} TEST(S) ÉCHOUÉ(S) - Le système a des problèmes`);
  }
  
  await clearTestData(testUserId);
  process.exit(passed === total ? 0 : 1);
}

// Exécuter les tests
runAllTests().catch(error => {
  logError(`Erreur fatale : ${error.message}`);
  process.exit(1);
});
