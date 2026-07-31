/**
 * API Route: Création de dépôt
 * POST /api/wallet/deposit
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { createMonCashPayment, generateReferenceId, generateIdempotencyKey } from "@/lib/moncash";
import { atomicDeposit } from "@/lib/atomicTransaction";
import { transactionExists } from "@/lib/ledger";
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 10000;

export async function POST(request: Request) {
  try {
    // 0. Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, "deposit", RATE_LIMIT_CONFIGS.deposit);
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
    const { amount, returnUrl, customerName, customerEmail } = body;

    if (typeof amount !== "number" || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      return NextResponse.json(
        { error: `Le montant doit être entre ${MIN_DEPOSIT} et ${MAX_DEPOSIT} HTG` },
        { status: 400 }
      );
    }

    // Valider le returnUrl s'il est fourni
    if (returnUrl) {
      try {
        const url = new URL(returnUrl);
        const allowedDomains = [
          process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, ''),
          'playtocash.vercel.app',
          'localhost'
        ];
        const hostname = url.hostname.replace(/^www\./, '');
        
        if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
          return NextResponse.json(
            { error: "URL de retour non autorisée" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "URL de retour invalide" },
          { status: 400 }
        );
      }
    }

    // 3. Générer les identifiants uniques
    const referenceId = generateReferenceId("deposit");
    const idempotencyKey = generateIdempotencyKey();

    console.log("[DEPOSIT_API] Création dépôt:", { userId, amount, referenceId });

    // 4. Vérifier la déduplication
    const exists = await transactionExists(userId, referenceId);
    if (exists) {
      return NextResponse.json(
        { error: "Transaction déjà existante" },
        { status: 409 }
      );
    }

    // 5. Créer le paiement MonCash (avant de créer le dépôt en Firebase)
    const moncashResponse = await createMonCashPayment(
      {
        amount,
        referenceId,
        returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/wallet/deposit-return?referenceId=${referenceId}&amount=${amount}`,
        customerName,
        customerEmail
      },
      idempotencyKey
    );

    // 6. Créer le dépôt en pending dans Firebase (seulement si MonCash a réussi)
    const depositRef = adminDB.ref(`deposits/${userId}/${referenceId}`);
    await depositRef.set({
      id: referenceId,
      userId,
      amount,
      status: "pending",
      paymentUrl: moncashResponse.paymentUrl,
      expiresAt: new Date(moncashResponse.expiresAt).getTime(),
      moncashReference: moncashResponse.reference,
      idempotencyKey,
      createdAt: Date.now()
    });

    console.log("[DEPOSIT_API] Paiement créé:", {
      referenceId,
      paymentUrl: moncashResponse.paymentUrl,
      moncashReference: moncashResponse.reference,
      expiresAt: moncashResponse.expiresAt
    });

    // 7. Retourner l'URL de paiement
    return NextResponse.json({
      success: true,
      depositId: referenceId,
      paymentUrl: moncashResponse.paymentUrl,
      referenceId: moncashResponse.reference,
      expiresAt: moncashResponse.expiresAt
    });

  } catch (error) {
    console.error("[DEPOSIT_API] Erreur:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la création du dépôt",
        success: false
      },
      { status: 500 }
    );
  }
}
