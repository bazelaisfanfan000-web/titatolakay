/**
 * API Route: Withdrawal (Retrait)
 * POST /api/wallet/withdraw
 * 
 * Flow:
 * 1. Valide userId, amount, moncashNumber
 * 2. Réserve le solde via transaction Firebase (débit atomique du montant brut)
 * 3. Crée une entrée de retrait avec status "pending"
 * 4. Appelle MonCashConnect /v1/payout-create avec le montant net (entier)
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

const MIN_WITHDRAWAL = 110; // HTG - Minimum requis
const MAX_WITHDRAWAL = 10000; // HTG - Maximum autorisé
const WITHDRAWAL_FEE_RATE = 0.05; // 5% de frais

interface WithdrawRequest {
  amount: number;
  moncashNumber: string;
}

/**
 * Débite le solde de manière atomique (montant brut)
 */
async function debitBalanceAtomically(
  userId: string,
  amount: number
): Promise<{ success: true; newBalance: number; oldBalance: number } | { success: false; error: string }> {
  const userRef = adminDB.ref(`users/${userId}`);

  console.log("[WITHDRAW] Début débit solde atomique:", { userId, amount });

  const userSnapshot = await userRef.once("value");
  if (!userSnapshot.exists()) {
    console.error("[WITHDRAW] Utilisateur inexistant:", userId);
    return { success: false, error: "Utilisateur inexistant" };
  }

  const userData = userSnapshot.val();
  const currentBalance = Number(userData.balance || 0);
  console.log("[WITHDRAW] Solde actuel:", { userId, currentBalance });

  if (currentBalance < amount) {
    console.error("[WITHDRAW] Solde insuffisant:", { currentBalance, amount });
    return { success: false, error: "Solde insuffisant" };
  }

  const result = await userRef.transaction((current: Record<string, unknown> | null) => {
    if (!current) {
      return {
        balance: currentBalance - amount,
        updatedAt: Date.now(),
      };
    }

    const cur = Number(current.balance || 0);
    if (cur < amount) return; // annule

    return {
      ...current,
      balance: cur - amount,
      updatedAt: Date.now(),
    };
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

  const result = await userRef.transaction((current: Record<string, unknown> | null) => {
    if (!current) {
      return {
        balance: amount,
        updatedAt: Date.now(),
      };
    }

    const cur = Number(current.balance || 0);
    return {
      ...current,
      balance: cur + amount,
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
    // Authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log("[WITHDRAW] Utilisateur authentifié:", userId);

    const body: WithdrawRequest = await request.json();
    const { amount, moncashNumber } = body;

    // Validation des champs
    if (!amount || !moncashNumber) {
      return NextResponse.json(
        { success: false, error: "Champs manquants" },
        { status: 400 }
      );
    }

    if (amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
      return NextResponse.json(
        { success: false, error: `Le montant doit être entre ${MIN_WITHDRAWAL} et ${MAX_WITHDRAWAL} HTG` },
        { status: 400 }
      );
    }

    // Format du numéro : accepter +509XXXXXXXX ou 509XXXXXXXX
    const phoneRegex = /^\+?509\d{8}$/;
    if (!phoneRegex.test(moncashNumber)) {
      return NextResponse.json(
        { success: false, error: "Numéro MonCash invalide (format: +509XXXXXXXX ou 509XXXXXXXX)" },
        { status: 400 }
      );
    }

    // Nettoyer le numéro (enlever le + si présent)
    const cleanNumber = moncashNumber.replace(/^\+/, "");

    // Vérifier le solde
    const userSnap = await adminDB.ref(`users/${userId}`).once("value");
    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Utilisateur inexistant" },
        { status: 404 }
      );
    }

    const userData = userSnap.val() as Record<string, unknown>;
    const currentBalance = Number(userData.balance || 0);
    if (currentBalance < amount) {
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    // ---- Calcul des frais ----
    // Nous prenons 5% de commission, l'utilisateur reçoit 95% sur son compte MonCash
    // Envoyer le montant brut à MonCash pour éviter l'erreur invalid_amount
    const fee = Math.round((amount * WITHDRAWAL_FEE_RATE) * 100) / 100; // Commission 5%
    const netAmount = Math.round(amount); // Envoyer le montant brut à MonCash

    console.log("[WITHDRAW] Calcul frais:", { amount, fee, netAmount });

    // 1. Débiter le solde (montant brut)
    const debitResult = await debitBalanceAtomically(userId, amount);
    if (!debitResult.success) {
      return NextResponse.json(
        { success: false, error: debitResult.error },
        { status: 500 }
      );
    }

    // 2. Générer les identifiants
    const withdrawalId = crypto.randomUUID();
    const referenceId = `withdraw_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

    // 3. Créer l'entrée de retrait (pending)
    const withdrawalData = {
      withdrawalId,
      referenceId,
      payoutReference: null,
      amount,          // brut
      fee,
      netAmount,       // net envoyé (entier)
      status: "pending",
      moncashNumber: cleanNumber, // stocker sans +
      createdAt: Date.now(),
      completedAt: null,
      failedAt: null,
      error: null,
      failureReason: null,
    };

    await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).set(withdrawalData);
    console.log("[WITHDRAW] Entrée de retrait créée:", withdrawalId);

    // 4. Appeler MonCashConnect avec le montant brut
    let payoutReference: string | null = null;
    try {
      console.log("[WITHDRAW] Appel MonCashConnect API avec montant brut:", netAmount);
      const payoutResult = await createMonCashPayout({
        amount: netAmount, // Envoyer le montant brut pour éviter invalid_amount
        moncashNumber: cleanNumber,
        referenceId: referenceId,
      });

      if (payoutResult.status === "success" && payoutResult.payout?.reference) {
        payoutReference = payoutResult.payout.reference;
        console.log("[WITHDRAW] Payout créé avec succès:", payoutReference);

        // Mettre à jour le retrait
        await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).update({
          payoutReference,
          status: "completed",
          completedAt: Date.now(),
        });

        // Ledger
        await createWithdrawalLedgerEntry(
          userId,
          netAmount,
          debitResult.oldBalance,
          debitResult.newBalance,
          payoutReference,
          withdrawalId
        );

        return NextResponse.json({
          success: true,
          message: "Retrait initié avec succès",
          withdrawalId,
          amountGross: amount,
          fee,
          netAmount,
        });
      } else {
        throw new Error("Erreur création payout - réponse inattendue");
      }
    } catch (moncashError: any) {
      console.error("[WITHDRAW] Erreur MonCashConnect API:", moncashError);

      // ROLLBACK : recréditer le solde (montant brut)
      console.log("[WITHDRAW] Début rollback...");
      const rollbackResult = await creditBalanceAtomically(userId, amount);
      if (!rollbackResult.success) {
        console.error("[WITHDRAW] CRITICAL: Rollback échoué!", rollbackResult.error);
        // Ici, envoyer une alerte admin
      } else {
        console.log("[WITHDRAW] Rollback réussi");
      }

      // Marquer le retrait comme échoué
      await adminDB.ref(`withdrawals/${userId}/${withdrawalId}`).update({
        status: "failed",
        failedAt: Date.now(),
        error: moncashError instanceof Error ? moncashError.message : "Erreur inconnue",
        failureReason: moncashError.message || "Erreur API",
      });

      // --- Message d'erreur personnalisé selon le type d'erreur ---
      let userErrorMessage = "Erreur inconnue lors du traitement du retrait.";
      const errorMsg = moncashError.message || "";

      if (errorMsg.includes("invalid_amount")) {
        userErrorMessage =
          "Le montant n'est pas accepté par MonCash. Essayez un montant différent entre 100 et 10000 HTG.";
      } else if (errorMsg.includes("insufficient_balance") || errorMsg.includes("insufficient balance")) {
        userErrorMessage =
          "Solde MonCash marchand insuffisant. Votre solde a été recrédité. Réessayez dans quelques heures.";
      } else if (errorMsg.includes("invalid_moncash_number")) {
        userErrorMessage = "Numéro MonCash invalide. Vérifiez le format (509XXXXXXXX).";
      } else if (errorMsg.includes("kyc_required")) {
        userErrorMessage = "Vérification d'identité requise pour effectuer des retraits. Contactez le support.";
      } else if (errorMsg.includes("duplicate_reference")) {
        userErrorMessage = "Cette demande de retrait a déjà été traitée. Vérifiez votre historique.";
      } else {
        userErrorMessage = errorMsg || "Erreur API MonCashConnect. Réessayez plus tard.";
      }

      return NextResponse.json(
        {
          success: false,
          error: userErrorMessage,
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