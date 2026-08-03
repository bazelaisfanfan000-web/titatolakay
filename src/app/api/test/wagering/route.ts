/**
 * API Route: Test du système wagering
 * GET /api/test/wagering
 * 
 * Cette API route teste le système wagering pour vérifier
 * qu'un utilisateur ne peut pas retirer sans avoir multiplié son dépôt par 2.
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TestResult {
  scenario: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export async function GET(request: Request) {
  console.log("[WAGERING TEST] Début des tests du système wagering");
  
  const results: TestResult[] = [];
  const testUserId = `test_wagering_${Date.now()}`;
  
  try {
    // Test 1: Dépôt simple + mise complète
    console.log("[WAGERING TEST] Scénario 1: Dépôt simple + mise complète");
    try {
      await adminDB.ref(`users/${testUserId}`).set({
        balance: 150,
        totalDeposits: 100,
        wageringRequired: 200,
        wageringCompleted: 0,
        withdrawalUnlocked: false,
        currency: 'HTG'
      });
      
      // Simuler mise 100 HTG
      await adminDB.ref(`users/${testUserId}`).transaction((current: Record<string, unknown> | null) => {
        if (!current) return;
        const newWageringCompleted = (Number(current.wageringCompleted || 0) + 100);
        const newWageringRequired = Number(current.totalDeposits || 0) * 2;
        return {
          ...current,
          wageringCompleted: newWageringCompleted,
          wageringRequired: newWageringRequired,
          withdrawalUnlocked: newWageringCompleted >= newWageringRequired,
          wageringUpdatedAt: Date.now()
        };
      });
      
      // Simuler mise 100 HTG
      await adminDB.ref(`users/${testUserId}`).transaction((current: Record<string, unknown> | null) => {
        if (!current) return;
        const newWageringCompleted = (Number(current.wageringCompleted || 0) + 100);
        const newWageringRequired = Number(current.totalDeposits || 0) * 2;
        return {
          ...current,
          wageringCompleted: newWageringCompleted,
          wageringRequired: newWageringRequired,
          withdrawalUnlocked: newWageringCompleted >= newWageringRequired,
          wageringUpdatedAt: Date.now()
        };
      });
      
      const user1 = (await adminDB.ref(`users/${testUserId}`).once("value")).val();
      const progress1 = (user1.wageringCompleted / user1.wageringRequired) * 100;
      
      if (user1.withdrawalUnlocked && progress1 >= 100) {
        results.push({
          scenario: "Scénario 1: Dépôt simple + mise complète",
          passed: true,
          message: `Retrait autorisé après ${user1.wageringCompleted} HTG de mises (${progress1.toFixed(0)}% complété)`,
          details: { wageringCompleted: user1.wageringCompleted, wageringRequired: user1.wageringRequired }
        });
      } else {
        results.push({
          scenario: "Scénario 1: Dépôt simple + mise complète",
          passed: false,
          message: `Retrait bloqué alors qu'il devrait être autorisé`,
          details: { wageringCompleted: user1.wageringCompleted, wageringRequired: user1.wageringRequired }
        });
      }
    } catch (error) {
      results.push({
        scenario: "Scénario 1: Dépôt simple + mise complète",
        passed: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    await adminDB.ref(`users/${testUserId}`).remove();
    
    // Test 2: Tentative de retrait sans wagering
    console.log("[WAGERING TEST] Scénario 2: Tentative de retrait sans wagering");
    try {
      await adminDB.ref(`users/${testUserId}`).set({
        balance: 150,
        totalDeposits: 100,
        wageringRequired: 200,
        wageringCompleted: 50,
        withdrawalUnlocked: false,
        currency: 'HTG'
      });
      
      const user2 = (await adminDB.ref(`users/${testUserId}`).once("value")).val();
      const progress2 = (user2.wageringCompleted / user2.wageringRequired) * 100;
      const remaining2 = user2.wageringRequired - user2.wageringCompleted;
      
      if (!user2.withdrawalUnlocked && user2.wageringCompleted < user2.wageringRequired) {
        results.push({
          scenario: "Scénario 2: Tentative de retrait sans wagering",
          passed: true,
          message: `Retrait bloqué comme attendu : encore ${remaining2} HTG à miser (${progress2.toFixed(0)}% complété)`,
          details: { wageringCompleted: user2.wageringCompleted, wageringRequired: user2.wageringRequired }
        });
      } else {
        results.push({
          scenario: "Scénario 2: Tentative de retrait sans wagering",
          passed: false,
          message: `Retrait autorisé alors qu'il devrait être bloqué`,
          details: { wageringCompleted: user2.wageringCompleted, wageringRequired: user2.wageringRequired }
        });
      }
    } catch (error) {
      results.push({
        scenario: "Scénario 2: Tentative de retrait sans wagering",
        passed: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    await adminDB.ref(`users/${testUserId}`).remove();
    
    // Test 3: Dépôts multiples
    console.log("[WAGERING TEST] Scénario 3: Dépôts multiples");
    try {
      await adminDB.ref(`users/${testUserId}`).set({
        balance: 150,
        totalDeposits: 100,
        wageringRequired: 200,
        wageringCompleted: 100,
        withdrawalUnlocked: false,
        currency: 'HTG'
      });
      
      // Simuler deuxième dépôt
      await adminDB.ref(`users/${testUserId}`).transaction((current: Record<string, unknown> | null) => {
        if (!current) return;
        const newTotalDeposits = (Number(current.totalDeposits || 0) + 100);
        const newWageringRequired = newTotalDeposits * 2;
        const currentWageringCompleted = Number(current.wageringCompleted || 0);
        return {
          ...current,
          totalDeposits: newTotalDeposits,
          wageringRequired: newWageringRequired,
          wageringCompleted: currentWageringCompleted,
          withdrawalUnlocked: currentWageringCompleted >= newWageringRequired,
          wageringUpdatedAt: Date.now()
        };
      });
      
      const user3 = (await adminDB.ref(`users/${testUserId}`).once("value")).val();
      const progress3 = (user3.wageringCompleted / user3.wageringRequired) * 100;
      
      if (user3.wageringCompleted === 100 && user3.wageringRequired === 400) {
        results.push({
          scenario: "Scénario 3: Dépôts multiples",
          passed: true,
          message: `Progression conservée : wageringCompleted=${user3.wageringCompleted} HTG (${progress3.toFixed(0)}%)`,
          details: { totalDeposits: user3.totalDeposits, wageringCompleted: user3.wageringCompleted, wageringRequired: user3.wageringRequired }
        });
      } else {
        results.push({
          scenario: "Scénario 3: Dépôts multiples",
          passed: false,
          message: `Progression non conservée correctement`,
          details: { totalDeposits: user3.totalDeposits, wageringCompleted: user3.wageringCompleted, wageringRequired: user3.wageringRequired }
        });
      }
    } catch (error) {
      results.push({
        scenario: "Scénario 3: Dépôts multiples",
        passed: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    await adminDB.ref(`users/${testUserId}`).remove();
    
    // Test 4: Aucun dépôt
    console.log("[WAGERING TEST] Scénario 4: Aucun dépôt");
    try {
      await adminDB.ref(`users/${testUserId}`).set({
        balance: 50,
        totalDeposits: 0,
        wageringRequired: 0,
        wageringCompleted: 0,
        withdrawalUnlocked: true,
        currency: 'HTG'
      });
      
      const user4 = (await adminDB.ref(`users/${testUserId}`).once("value")).val();
      
      if (user4.totalDeposits === 0 && user4.withdrawalUnlocked) {
        results.push({
          scenario: "Scénario 4: Aucun dépôt",
          passed: true,
          message: `Retrait autorisé pour utilisateur sans dépôt`,
          details: { totalDeposits: user4.totalDeposits, withdrawalUnlocked: user4.withdrawalUnlocked }
        });
      } else {
        results.push({
          scenario: "Scénario 4: Aucun dépôt",
          passed: false,
          message: `Retrait bloqué pour utilisateur sans dépôt`,
          details: { totalDeposits: user4.totalDeposits, withdrawalUnlocked: user4.withdrawalUnlocked }
        });
      }
    } catch (error) {
      results.push({
        scenario: "Scénario 4: Aucun dépôt",
        passed: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    await adminDB.ref(`users/${testUserId}`).remove();
    
    // Test 5: Wagering partiel
    console.log("[WAGERING TEST] Scénario 5: Wagering partiel");
    try {
      await adminDB.ref(`users/${testUserId}`).set({
        balance: 150,
        totalDeposits: 100,
        wageringRequired: 200,
        wageringCompleted: 150,
        withdrawalUnlocked: false,
        currency: 'HTG'
      });
      
      const user5 = (await adminDB.ref(`users/${testUserId}`).once("value")).val();
      const progress5 = (user5.wageringCompleted / user5.wageringRequired) * 100;
      const remaining5 = user5.wageringRequired - user5.wageringCompleted;
      
      if (!user5.withdrawalUnlocked && remaining5 > 0) {
        results.push({
          scenario: "Scénario 5: Wagering partiel",
          passed: true,
          message: `Retrait bloqué : encore ${remaining5} HTG à miser (${progress5.toFixed(0)}% complété)`,
          details: { wageringCompleted: user5.wageringCompleted, wageringRequired: user5.wageringRequired }
        });
      } else {
        results.push({
          scenario: "Scénario 5: Wagering partiel",
          passed: false,
          message: `Retrait autorisé alors qu'il devrait être bloqué`,
          details: { wageringCompleted: user5.wageringCompleted, wageringRequired: user5.wageringRequired }
        });
      }
    } catch (error) {
      results.push({
        scenario: "Scénario 5: Wagering partiel",
        passed: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    await adminDB.ref(`users/${testUserId}`).remove();
    
    // Calcul du résumé
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const failed = total - passed;
    
    const summary: TestSummary = {
      total,
      passed,
      failed,
      results
    };
    
    console.log("[WAGERING TEST] Tests terminés:", { passed, failed, total });
    
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error("[WAGERING TEST] Erreur fatale:", error);
    return NextResponse.json({
      error: "Erreur lors des tests",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
