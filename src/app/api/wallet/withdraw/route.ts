/**
 * API Route: Création de retrait
 * POST /api/wallet/withdraw
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { createMonCashPayout, generateReferenceId, generateIdempotencyKey } from "@/lib/moncash";
import { atomicWithdrawal } from "@/lib/atomicTransaction";
import { hasAvailableBalance } from "@/lib/wallet";
import { transactionExists } from "@/lib/ledger";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;
const DAILY_WITHDRAW_LIMIT = 200000; // Limite journalière de 200,000 HTG

export async function POST(request: Request) {
  try {
    // 0. Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, "withdraw", RATE_LIMIT_CONFIGS.withdraw);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 }
      );
    }

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

    // 5. Vérifier la limite journalière de retrait
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const withdrawalsRef = adminDB.ref(`withdrawals/${userId}`);
    const withdrawalsSnapshot = await withdrawalsRef
      .orderByChild("createdAt")
      .startAt(todayTimestamp)
      .once("value");

    let todayTotal = 0;
    if (withdrawalsSnapshot.exists()) {
      withdrawalsSnapshot.forEach((child: any) => {
        const withdrawal = child.val();
        if (withdrawal.status !== "failed") {
          todayTotal += withdrawal.amount || 0;
        }
      });
    }

    if (todayTotal + amount > DAILY_WITHDRAW_LIMIT) {
      return NextResponse.json(
        { 
          error: `Limite journalière dépassée. Vous avez déjà retiré ${todayTotal} HTG aujourd'hui. La limite est de ${DAILY_WITHDRAW_LIMIT} HTG.` 
        },
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

    // 8. Débiter immédiatement et créer le retrait en pending
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
