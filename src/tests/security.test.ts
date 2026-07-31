/*
====================================================
TESTS DE SÉCURITÉ - TITATO
====================================================

Ces tests simulent des attaques pour vérifier
la robustesse du système financier.
*/

import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

/*
====================================================
CONSTANTES DE TEST
====================================================
*/
const TEST_UID_1 = "test_user_1";
const TEST_UID_2 = "test_user_2";
const TEST_ROOM_ID = "test_security_room";

/*
====================================================
TEST 1 : DOUBLE PAIEMENT
====================================================

Objectif : Vérifier qu'un utilisateur ne peut pas
recevoir le gain d'une partie deux fois.
*/
export async function testDoublePayment() {
  console.log("=== TEST 1: DOUBLE PAIEMENT ===");
  
  try {
    // Créer une partie terminée avec gagnant
    await adminDB.ref(`rooms/${TEST_ROOM_ID}`).set({
      id: TEST_ROOM_ID,
      status: "finished",
      bet: 100,
      playersCount: 2,
      pot: 200,
      game: {
        status: "finished",
        winner: "X",
        paymentStatus: null,
      },
      players: {
        [TEST_UID_1]: { uid: TEST_UID_1, symbol: "X", betPaid: true },
        [TEST_UID_2]: { uid: TEST_UID_2, symbol: "O", betPaid: true },
      },
    });

    // Premier appel finish-payment
    const response1 = await fetch("http://localhost:3000/api/game/finish-payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: TEST_ROOM_ID }),
    });

    const data1 = await response1.json();
    console.log("Premier appel:", data1.success ? "SUCCÈS" : "ÉCHEC");

    // Deuxième appel finish-payment (doit échouer)
    const response2 = await fetch("http://localhost:3000/api/game/finish-payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: TEST_ROOM_ID }),
    });

    const data2 = await response2.json();
    console.log("Deuxième appel:", data2.success ? "SUCCÈS" : "ÉCHEC");

    // Vérification
    if (data1.success && !data2.success) {
      console.log("✅ TEST PASSÉ: Double paiement bloqué");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Double paiement possible");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 2 : REQUÊTES SIMULTANÉES (RACE CONDITION)
====================================================

Objectif : Vérifier que deux requêtes simultanées
ne provoquent pas de double débit.
*/
export async function testSimultaneousRequests() {
  console.log("=== TEST 2: REQUÊTES SIMULTANÉES ===");
  
  try {
    // Initialiser solde utilisateur
    await adminDB.ref(`users/${TEST_UID_1}/balance`).set(1000);

    // Envoyer deux requêtes simultanées
    const [result1, result2] = await Promise.all([
      fetch("http://localhost:3000/api/game/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bet: 100 }),
      }),
      fetch("http://localhost:3000/api/game/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bet: 100 }),
      }),
    ]);

    const data1 = await result1.json();
    const data2 = await result2.json();

    // Vérifier solde final
    const balanceSnapshot = await adminDB.ref(`users/${TEST_UID_1}/balance`).get();
    const finalBalance = balanceSnapshot.val();

    console.log("Requête 1:", data1.success ? "SUCCÈS" : "ÉCHEC");
    console.log("Requête 2:", data2.success ? "SUCCÈS" : "ÉCHEC");
    console.log("Solde final:", finalBalance);

    // Solde doit être 800 (1000 - 100 - 100) ou 900 si une seule a réussi
    if (finalBalance === 800 || finalBalance === 900) {
      console.log("✅ TEST PASSÉ: Race condition gérée");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Solde incorrect");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 3 : VOL DE GAIN
====================================================

Objectif : Vérifier qu'un utilisateur ne peut pas
réclamer le gain d'une autre partie.
*/
export async function testGainTheft() {
  console.log("=== TEST 3: VOL DE GAIN ===");
  
  try {
    // Créer une partie gagnée par TEST_UID_1
    await adminDB.ref(`rooms/${TEST_ROOM_ID}`).set({
      id: TEST_ROOM_ID,
      status: "finished",
      bet: 100,
      playersCount: 2,
      pot: 200,
      game: {
        status: "finished",
        winner: "X",
        paymentStatus: null,
      },
      players: {
        [TEST_UID_1]: { uid: TEST_UID_1, symbol: "X", betPaid: true },
        [TEST_UID_2]: { uid: TEST_UID_2, symbol: "O", betPaid: true },
      },
    });

    // TEST_UID_2 essaie de réclamer le gain
    const response = await fetch("http://localhost:3000/api/game/finish-payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_2)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: TEST_ROOM_ID }),
    });

    const data = await response.json();
    console.log("Tentative de vol:", data.success ? "SUCCÈS" : "ÉCHEC");

    if (!data.success && data.error === "Seul le gagnant peut finaliser le paiement") {
      console.log("✅ TEST PASSÉ: Vol de gain bloqué");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Vol de gain possible");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 4 : BYPASS COMMISSION
====================================================

Objectif : Vérifier que la commission ne peut pas
être modifiée depuis le client.
*/
export async function testCommissionBypass() {
  console.log("=== TEST 4: BYPASS COMMISSION ===");
  
  try {
    // Créer une partie
    await adminDB.ref(`rooms/${TEST_ROOM_ID}`).set({
      id: TEST_ROOM_ID,
      status: "finished",
      bet: 100,
      playersCount: 2,
      pot: 200,
      game: {
        status: "finished",
        winner: "X",
        paymentStatus: null,
      },
      players: {
        [TEST_UID_1]: { uid: TEST_UID_1, symbol: "X", betPaid: true },
        [TEST_UID_2]: { uid: TEST_UID_2, symbol: "O", betPaid: true },
      },
    });

    // Appel normal
    const response = await fetch("http://localhost:3000/api/game/finish-payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: TEST_ROOM_ID }),
    });

    const data = await response.json();
    console.log("Commission appliquée:", data.commission);
    console.log("Gain calculé:", data.reward);

    // Commission doit être 100 (50% de 200)
    // Gain doit être 100 (200 - 100)
    if (data.commission === 100 && data.reward === 100) {
      console.log("✅ TEST PASSÉ: Commission correcte");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Commission incorrecte");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 5 : DOUBLE DÉBIT
====================================================

Objectif : Vérifier que le débit de mise est atomique.
*/
export async function testDoubleDebit() {
  console.log("=== TEST 5: DOUBLE DÉBIT ===");
  
  try {
    // Initialiser solde
    await adminDB.ref(`users/${TEST_UID_1}/balance`).set(200);

    // Tenter de déduire deux fois le même montant
    const deduct1 = await adminDB.ref(`users/${TEST_UID_1}`).transaction((current: any) => {
      const balance = Number(current?.balance || 0);
      if (balance < 100) return current;
      return { ...current, balance: balance - 100 };
    });

    const deduct2 = await adminDB.ref(`users/${TEST_UID_1}`).transaction((current: any) => {
      const balance = Number(current?.balance || 0);
      if (balance < 100) return current;
      return { ...current, balance: balance - 100 };
    });

    const balanceSnapshot = await adminDB.ref(`users/${TEST_UID_1}/balance`).get();
    const finalBalance = balanceSnapshot.val();

    console.log("Débit 1:", deduct1.committed ? "SUCCÈS" : "ÉCHEC");
    console.log("Débit 2:", deduct2.committed ? "SUCCÈS" : "ÉCHEC");
    console.log("Solde final:", finalBalance);

    // Au moins un débit doit échouer
    if (finalBalance >= 100) {
      console.log("✅ TEST PASSÉ: Double débit bloqué");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Double débit possible");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 6 : LIMITE DE MISE
====================================================

Objectif : Vérifier les limites de mise (min 25, max 10000).
*/
export async function testBetLimits() {
  console.log("=== TEST 6: LIMITE DE MISE ===");
  
  try {
    await adminDB.ref(`users/${TEST_UID_1}/balance`).set(20000);

    // Test mise trop basse
    const response1 = await fetch("http://localhost:3000/api/game/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bet: 10 }),
    });

    const data1 = await response1.json();
    console.log("Mise 10 HTG:", data1.success ? "SUCCÈS" : "ÉCHEC");

    // Test mise trop haute
    const response2 = await fetch("http://localhost:3000/api/game/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bet: 15000 }),
    });

    const data2 = await response2.json();
    console.log("Mise 15000 HTG:", data2.success ? "SUCCÈS" : "ÉCHEC");

    // Test mise valide
    const response3 = await fetch("http://localhost:3000/api/game/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bet: 100 }),
    });

    const data3 = await response3.json();
    console.log("Mise 100 HTG:", data3.success ? "SUCCÈS" : "ÉCHEC");

    if (!data1.success && !data2.success && data3.success) {
      console.log("✅ TEST PASSÉ: Limites de mise respectées");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Limites de mise non respectées");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 7 : MATCH NUL
====================================================

Objectif : Vérifier la gestion du match nul.
*/
export async function testDrawGame() {
  console.log("=== TEST 7: MATCH NUL ===");
  
  try {
    // Créer une partie avec plateau rempli et pas de gagnant
    const board: Record<string, string> = {};
    for (let i = 0; i < 25; i++) {
      board[`cell_${i}`] = i % 2 === 0 ? "X" : "O";
    }

    await adminDB.ref(`rooms/${TEST_ROOM_ID}`).set({
      id: TEST_ROOM_ID,
      status: "playing",
      bet: 100,
      playersCount: 2,
      pot: 200,
      game: {
        status: "playing",
        board,
        winner: null,
        round: 1,
      },
      players: {
        [TEST_UID_1]: { uid: TEST_UID_1, symbol: "X", betPaid: true },
        [TEST_UID_2]: { uid: TEST_UID_2, symbol: "O", betPaid: true },
      },
    });

    // Appel draw
    const response = await fetch("http://localhost:3000/api/game/draw", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getTestToken(TEST_UID_1)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: TEST_ROOM_ID }),
    });

    const data = await response.json();
    console.log("Match nul:", data.success ? "SUCCÈS" : "ÉCHEC");
    console.log("Round:", data.round);

    if (data.success && data.round === 2) {
      console.log("✅ TEST PASSÉ: Match nul géré");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Match nul non géré");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
TEST 8 : PARTIE ABANDONNÉE
====================================================

Objectif : Vérifier le remboursement automatique.
*/
export async function testAbandonedGame() {
  console.log("=== TEST 8: PARTIE ABANDONNÉE ===");
  
  try {
    // Créer une partie vieille de 15 minutes
    const oldTime = Date.now() - 15 * 60 * 1000;
    
    await adminDB.ref(`rooms/${TEST_ROOM_ID}`).set({
      id: TEST_ROOM_ID,
      status: "waiting",
      bet: 100,
      playersCount: 1,
      pot: 100,
      createdAt: oldTime,
      updatedAt: oldTime,
      players: {
        [TEST_UID_1]: { uid: TEST_UID_1, symbol: "X", betPaid: true },
      },
    });

    // Initialiser solde
    await adminDB.ref(`users/${TEST_UID_1}/balance`).set(500);

    // Nettoyer les parties abandonnées
    const { cleanupAbandonedGames } = await import("@/lib/gameAbandon");
    const result = await cleanupAbandonedGames();

    console.log("Parties traitées:", result.processed);
    console.log("Remboursements:", result.refunded);

    // Vérifier solde
    const balanceSnapshot = await adminDB.ref(`users/${TEST_UID_1}/balance`).get();
    const finalBalance = balanceSnapshot.val();

    console.log("Solde final:", finalBalance);

    if (finalBalance === 600) { // 500 + 100 remboursement
      console.log("✅ TEST PASSÉ: Remboursement automatique");
      return true;
    } else {
      console.log("❌ TEST ÉCHOUÉ: Remboursement non effectué");
      return false;
    }
  } catch (error) {
    console.error("❌ TEST ERROR:", error);
    return false;
  }
}

/*
====================================================
FONCTION UTILITAIRE
====================================================
*/
async function getTestToken(uid: string): Promise<string> {
  // En production, utiliser un vrai token Firebase
  // Pour les tests, on peut créer un token de test
  return `test_token_${uid}`;
}

/*
====================================================
EXÉCUTER TOUS LES TESTS
====================================================
*/
export async function runAllSecurityTests() {
  console.log("========================================");
  console.log("DÉBUT DES TESTS DE SÉCURITÉ");
  console.log("========================================");

  const results = {
    doublePayment: await testDoublePayment(),
    simultaneousRequests: await testSimultaneousRequests(),
    gainTheft: await testGainTheft(),
    commissionBypass: await testCommissionBypass(),
    doubleDebit: await testDoubleDebit(),
    betLimits: await testBetLimits(),
    drawGame: await testDrawGame(),
    abandonedGame: await testAbandonedGame(),
  };

  console.log("========================================");
  console.log("RÉSULTATS DES TESTS");
  console.log("========================================");
  console.log("Double paiement:", results.doublePayment ? "✅" : "❌");
  console.log("Requêtes simultanées:", results.simultaneousRequests ? "✅" : "❌");
  console.log("Vol de gain:", results.gainTheft ? "✅" : "❌");
  console.log("Bypass commission:", results.commissionBypass ? "✅" : "❌");
  console.log("Double débit:", results.doubleDebit ? "✅" : "❌");
  console.log("Limites de mise:", results.betLimits ? "✅" : "❌");
  console.log("Match nul:", results.drawGame ? "✅" : "❌");
  console.log("Partie abandonnée:", results.abandonedGame ? "✅" : "❌");

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log("========================================");
  console.log(`SCORE: ${passed}/${total} tests passés`);
  console.log("========================================");

  return results;
}
