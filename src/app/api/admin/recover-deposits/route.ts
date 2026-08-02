/**
 * API Route: Récupération des dépôts échoués
 * POST /api/admin/recover-deposits
 * Permet de traiter manuellement les webhooks qui ont échoué
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { completeMonCashDeposit, resolveDepositByReference } from "@/lib/moncashDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Reference requise" },
        { status: 400 }
      );
    }

    console.log("[RECOVER_DEPOSITS] Récupération du dépôt:", reference);

    // Récupérer l'événement échoué
    const failedEventRef = adminDB.ref(`failed_webhook_events/${reference}`);
    const failedEventSnapshot = await failedEventRef.once("value");

    if (!failedEventSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Événement échoué non trouvé" },
        { status: 404 }
      );
    }

    const failedEvent = failedEventSnapshot.val();
    console.log("[RECOVER_DEPOSITS] Événement échoué trouvé:", failedEvent);

    const resolved = await resolveDepositByReference(reference);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Dépôt non trouvé dans deposit_index" },
        { status: 404 }
      );
    }

    const depositData = resolved.deposit;
    console.log("[RECOVER_DEPOSITS] Dépôt trouvé:", depositData);

    if (depositData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Dépôt déjà traité avec statut: ${String(depositData.status)}` },
        { status: 400 }
      );
    }

    if (Number(depositData.amount) !== Number(failedEvent.amount)) {
      return NextResponse.json(
        { success: false, error: "Montant mismatch" },
        { status: 400 }
      );
    }

    const completion = await completeMonCashDeposit({
      reference,
      amountFromWebhook: Number(failedEvent.amount),
      verifyWithMonCashApi: true,
    });

    if (!completion.ok) {
      return NextResponse.json(
        { success: false, error: completion.message },
        { status: completion.retryable ? 503 : 400 }
      );
    }

    await failedEventRef.remove();

    return NextResponse.json({
      success: true,
      message: "Dépôt récupéré avec succès",
      data: {
        reference,
        userId: resolved.userId,
        amount: failedEvent.amount,
        newBalance: completion.newBalance,
      },
    });

  } catch (error) {
    console.error("[RECOVER_DEPOSITS] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET: Lister tous les événements échoués
export async function GET(request: Request) {
  try {
    console.log("[RECOVER_DEPOSITS] Liste des événements échoués");

    const failedEventsRef = adminDB.ref("failed_webhook_events");
    const snapshot = await failedEventsRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({
        success: true,
        events: []
      });
    }

    const events: any[] = [];
    snapshot.forEach((childSnapshot: any) => {
      events.push({
        reference: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    console.log("[RECOVER_DEPOSITS] Événements échoués:", events.length);

    return NextResponse.json({
      success: true,
      events
    });

  } catch (error) {
    console.error("[RECOVER_DEPOSITS] Erreur listing events:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
