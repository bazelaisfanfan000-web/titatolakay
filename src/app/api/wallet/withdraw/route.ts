/**
 * API Route: Création de retrait
 * POST /api/wallet/withdraw
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { createMonCashPayout, generateReferenceId, generateIdempotencyKey } from "@/lib/moncash";
import { atomicWithdrawal } from "@/lib/atomicTransaction";
import { hasAvailableBalance, getWallet } from "@/lib/wallet";
import { transactionExists } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 10000;

export async function POST(request: Request) {
  try {
    // 1. Authentification Firebase
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Validation du corps de la requête
    const body = await request.json();
    const { amount, moncashNumber } = body;

    if (typeof amount !== "number" || amount < MIN_WITHDRAW || amount > MAX_WITHDRAW) {
      return NextResponse.json(
        { error: `Le montant doit être entre ${MIN_WITHDRAW} et ${MAX_WITHDRAW} HTG` },
        { status: 400 }
      );
    }

    // 3. Validation du numéro MonCash
    const cleanNumber = moncashNumber.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cleanNumber)) {
      return NextResponse.json(
        { error: "Numéro MonCash invalide (8 chiffres requis)" },
        { status: 400 }
      );
    }

    // 4. Vérifier le solde disponible
    const hasBalance = await hasAvailableBalance(userId, amount);
    if (!hasBalance) {
      return NextResponse.json(
        { error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    // 5. Vérifier s'il y a déjà un retrait en cours
    const wallet = await getWallet(userId);
    if (wallet && wallet.lockedBalance > 0) {
      return NextResponse.json(
        { error: "Un retrait est déjà en cours" },
        { status: 400 }
      );
    }

    // 6. Générer les identifiants uniques
    const referenceId = generateReferenceId("withdraw");
    const idempotencyKey = generateIdempotencyKey();

    console.log("[WITHDRAW_API] Création retrait:", { userId, amount, referenceId });

    // 7. Vérifier la déduplication
    const exists = await transactionExists(userId, referenceId);
    if (exists) {
      return NextResponse.json(
        { error: "Transaction déjà existante" },
        { status: 409 }
      );
    }

    // 8. Verrouiller le montant et créer le retrait en pending
    const atomicResult = await atomicWithdrawal({
      userId,
      amount,
      moncashNumber: cleanNumber,
      referenceId,
      idempotencyKey
    });

    if (!atomicResult.success) {
      return NextResponse.json(
        { error: atomicResult.error || "Erreur lors de la création du retrait" },
        { status: 400 }
      );
    }

    // 9. Créer le payout MonCash
    const moncashResponse = await createMonCashPayout(
      {
        amount,
        moncashNumber: cleanNumber,
        referenceId
      },
      idempotencyKey
    );

    // 10. Mettre à jour le retrait avec les infos MonCash
    const withdrawalRef = adminDB.ref(`withdrawals/${userId}/${referenceId}`);
    await withdrawalRef.update({
      moncashReference: moncashResponse.payout.reference,
      fee: moncashResponse.payout.fee_htg,
      netAmount: moncashResponse.payout.net_htg,
      recipientAccountMasked: moncashResponse.payout.recipient_account_masked,
      status: "queued"
    });

    console.log("[WITHDRAW_API] Retrait créé:", {
      referenceId,
      moncashReference: moncashResponse.payout.reference,
      status: moncashResponse.payout.status
    });

    // 11. Retourner le résultat
    return NextResponse.json({
      success: true,
      withdrawalId: referenceId,
      referenceId: moncashResponse.payout.reference,
      status: moncashResponse.payout.status,
      amount: moncashResponse.payout.amount_htg,
      fee: moncashResponse.payout.fee_htg,
      recipientAccountMasked: moncashResponse.payout.recipient_account_masked
    });

  } catch (error) {
    console.error("[WITHDRAW_API] Erreur:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la création du retrait",
        success: false
      },
      { status: 500 }
    );
  }
}
