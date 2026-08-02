/**
 * API Route: Withdrawal (Retrait)
 * POST /api/wallet/withdraw
 * 
 * Flow:
 * 1. Valide userId, amount, moncashNumber
 * 2. Réserve le solde via transaction Firebase (débit atomique)
 * 3. Crée une entrée de retrait avec status "pending"
 * 4. Appelle MonCashConnect /v1/payout-create
 * 5. En cas de succès: met à jour payoutReference
 * 6. En cas d'échec: recrédite le solde (rollback), met status "failed"
 */

import { NextResponse } from "next/server";
import { adminDB, adminAuth } from "@/lib/firebaseAdmin";
import { createMonCashPayout } from "@/lib/moncash";
import { createWithdrawalLedgerEntry } from "@/lib/ledger";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_WITHDRAWAL = 100; // HTG - Minimum requis par MonCash
const MAX_WITHDRAWAL = 10000; // HTG - Maximum autorisé

interface WithdrawRequest {
  amount: number;
  moncashNumber: string;
}

interface WithdrawResponse {
  success: boolean;
  message?: string;
  error?: string;
  withdrawalId?: string;
}

/**
 * Débite le solde de manière atomique
 * Utilise une transaction Firebase pour garantir l'atomicité
 */
async function debitBalanceAtomically(
  userId: string,
  amount: number
): Promise<{ success: true; newBalance: number; oldBalance: number } | { success: false; error: string }> {
  const userRef = adminDB.ref(`users/${userId}`);

  console.log("[WITHDRAW] Début débit solde atomique:", { userId, amount });

  // D'abord vérifier si l'utilisateur existe
  const userSnapshot = await userRef.once("value");
  if (!userSnapshot.exists()) {
    console.error("[WITHDRAW] Utilisateur inexistant:", userId);
    return { success: false, error: "Utilisateur inexistant" };
  }

  const userData = userSnapshot.val();
  const currentBalance = Number(userData.balance || 0);
  console.log("[WITHDRAW] Données utilisateur:", { userId, currentBalance, userData });

  if (currentBalance < amount) {
    console.error("[WITHDRAW] Solde insuffisant:", { currentBalance, amount });
    return { success: false, error: "Solde insuffisant" };
  }

  // Transaction sur l'objet utilisateur complet
  const result = await userRef.transaction((current: Record<string, unknown> | null) => {
    console.log("[WITHDRAW] Transaction callback - current:", current);
    
    // Si current est null, créer l'objet avec le solde initial
    if (!current) {
      console.log("[WITHDRAW] Transaction - current est null, création objet");
      return {
        balance: currentBalance - amount,
        updatedAt: Date.now(),
      };
    }

    const cur = Number(current.balance || 0);
    console.log("[WITHDRAW] Transaction - Solde actuel:", { cur, amount });
    
    if (cur < amount) {
      console.error("[WITHDRAW] Transaction - Solde insuffisant:", { cur, amount });
      return; // Annuler la transaction
    }

    const newBalance = cur - amount;
    console.log("[WITHDRAW] Transaction - Débit solde:", { cur, amount, newBalance });

    return {
      ...current,
      balance: newBalance,
      updatedAt: Date.now(),
    };
  });

  console.log("[WITHDRAW] Résultat transaction:", { 
    committed: result.committed, 
    snapshot: result.snapshot.exists() 
  });

  if (!result.committed) {
    console.error("[WITHDRAW] Transaction non committed");
    return { success: false, error: "Transaction Firebase échouée" };
  }

  const newUserData = result.snapshot.val();
  const newBalance = Number(newUserData?.balance || 0);
  const oldBalance = newBalance + amount;

  console.log("[WITHDRAW] Débit réussi:", { userId, amount, oldBalance, newBalance });
  return { success: true, newBalance, oldBalance };
}

/**
 * Recrédite le solde en cas d'échec (rollback)
 */
async function creditBalanceAtomically(
  userId: string,
  amount: number
): Promise<{ success: true; newBalance: number } | { success: false; error: string }> {
  const userRef = adminDB.ref(`users/${userId}`);

  console.log("[WITHDRAW] Rollback - recrédit solde:", { userId, amount });

  // Transaction sur l'objet utilisateur complet
  const result = await userRef.transaction((current: Record<string, unknown> | null) => {
    console.log("[WITHDRAW] Rollback transaction callback - current:", current);
    
    // Si current est null, créer l'objet avec le solde initial
    if (!current) {
      console.log("[WITHDRAW] Rollback - current est null, création objet");
      return {
        balance: amount,
        updatedAt: Date.now(),
      };
    }

    const cur = Number(current.balance || 0);
    const newBalance = cur + amount;

    console.log("[WITHDRAW] Rollback - Recrédit solde:", { cur, amount, newBalance });

    return {
      ...current,
      balance: newBalance,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    console.error("[WITHDRAW] Rollback transaction non committed");
    return { success: false, error: "Rollback transaction échouée" };
  }

  const newUserData = result.snapshot.val();
  const newBalance = Number(newUserData?.balance || 0);
  console.log("[WITHDRAW] Rollback réussi:", { userId, amount, newBalance });
  return { success: true, newBalance };
}

export async function POST(request: Request) {
  console.log("[WITHDRAW] Requête retrait reçue");

  try {
    // Vérifier l'authentification Firebase
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[WITHDRAW] Auth header manquant");
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Vérifier le token Firebase avec Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log("[WITHDRAW] Utilisateur authentifié:", userId);

    const body: WithdrawRequest = await request.json();
    const { amount, moncashNumber } = body;

    // Validation
    if (!amount || !moncashNumber) {
      console.error("[WITHDRAW] Champs manquants:", { amount, moncashNumber });
      return NextResponse.json(
        { success: false, error: "Champs manquants" },
        { status: 400 }
      );
    }

    if (amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
      console.error("[WITHDRAW] Montant invalide:", amount);
      return NextResponse.json(
        { success: false, error: `Le montant doit être entre ${MIN_WITHDRAWAL} et ${MAX_WITHDRAWAL} HTG` },
        { status: 400 }
      );
    }

    // Valider le numéro MonCash
    const phoneRegex = /^\+509\d{8}$/;
    if (!phoneRegex.test(moncashNumber)) {
      console.error("[WITHDRAW] Numéro MonCash invalide:", moncashNumber);
      return NextResponse.json(
        { success: false, error: "Numéro MonCash invalide (format: +509XXXXXXXX)" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const userSnap = await adminDB.ref(`users/${userId}`).once("value");
    if (!userSnap.exists()) {
      console.error("[WITHDRAW] Utilisateur inexistant:", userId);
      return NextResponse.json(
        { success: false, error: "Utilisateur inexistant" },
        { status: 404 }
      );
    }

    const userData = userSnap.val() as Record<string, unknown>;
    const currentBalance = Number(userData.balance || 0);

    if (currentBalance < amount) {
      console.error("[WITHDRAW] Solde insuffisant:", { currentBalance, amount });
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    console.log("[WITHDRAW] Validation OK, début du processus:", { userId, amount, moncashNumber });

    // 1. Débiter le solde de manière atomique
    const debitResult = await debitBalanceAtomically(userId, amount);
    if (!debitResult.success) {
      console.error("[WITHDRAW] Échec débit solde:", debitResult.error);
      return NextResponse.json(
        { success: false, error: debitResult.error },
        { status: 500 }
      );
    }

    console.log("[WITHDRAW] Solde débité avec succès:", debitResult);

    // 2. Générer un ID de retrait unique
    const withdrawalId = crypto.randomUUID();
    const referenceId = `withdraw_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

    // 3. Créer l'entrée de retrait avec status "pending"
    const withdrawalData = {
      withdrawalId,
      referenceId,
      payoutReference: null,
      amount,
      status: "pending",
      moncashNumber,
      createdAt: Date.now(),
      completedAt: null,
      failedAt: null,
      error: null,
      failureReason: null,
      fee_htg: null,
      net_htg: null,
    };

    await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).set(withdrawalData);
    console.log("[WITHDRAW] Entrée de retrait créée:", withdrawalId);

    // 4. Appeler MonCashConnect API
    let payoutReference: string | null = null;
    try {
      console.log("[WITHDRAW] Appel MonCashConnect API...");
      const payoutResult = await createMonCashPayout({
        amount: amount,
        moncashNumber: moncashNumber,
        referenceId: referenceId,
      });

      if (payoutResult.status === "success" && payoutResult.payout?.reference) {
        payoutReference = payoutResult.payout.reference;
        console.log("[WITHDRAW] Payout créé avec succès:", payoutReference);

        // Mettre à jour le retrait avec la référence
        await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).update({
          payoutReference,
          fee_htg: payoutResult.payout.fee_htg,
          net_htg: payoutResult.payout.net_htg,
        });

        // Créer l'entrée ledger
        if (payoutReference) {
          const ledgerResult = await createWithdrawalLedgerEntry(
            userId,
            amount,
            debitResult.oldBalance,
            debitResult.newBalance,
            payoutReference,
            withdrawalId
          );

          if (!ledgerResult.success) {
            console.error("[WITHDRAW] Erreur création ledger:", ledgerResult.error);
          }
        }

        console.log("[WITHDRAW] Retrait complété avec succès");
        return NextResponse.json({
          success: true,
          message: "Retrait initié avec succès",
          withdrawalId,
        });

      } else {
        throw new Error("Erreur création payout");
      }

    } catch (moncashError) {
      console.error("[WITHDRAW] Erreur MonCashConnect API:", moncashError);

      // ROLLBACK: Recréditer le solde
      console.log("[WITHDRAW] Début rollback...");
      const rollbackResult = await creditBalanceAtomically(userId, amount);

      if (!rollbackResult.success) {
        console.error("[WITHDRAW] CRITICAL: Rollback échoué!", rollbackResult.error);
        // Envoyer une alerte admin ici
      } else {
        console.log("[WITHDRAW] Rollback réussi");
      }

      // Marquer le retrait comme échoué
      await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).update({
        status: "failed",
        failedAt: Date.now(),
        error: moncashError instanceof Error ? moncashError.message : "Erreur inconnue",
        failureReason: "Erreur API MonCashConnect",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la création du payout. Votre solde a été recrédité.",
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[WITHDRAW] Erreur inattendue:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
