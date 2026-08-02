/**
 * API Route: Vérification du statut d'un dépôt
 * GET /api/wallet/deposit/status?referenceId=xxx
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { getPaymentStatus } from "@/lib/moncash";
import { completeMonCashDeposit } from "@/lib/moncashDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // 2. Récupérer le referenceId
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get("referenceId");

    if (!referenceId) {
      return NextResponse.json(
        { error: "referenceId requis" },
        { status: 400 }
      );
    }

    console.log("[DEPOSIT_STATUS] Vérification:", { userId, referenceId });

    // 3. Récupérer le dépôt depuis Firebase
    const depositRef = adminDB.ref(`deposits/${userId}/${referenceId}`);
    const depositSnapshot = await depositRef.once("value");

    if (!depositSnapshot.exists()) {
      return NextResponse.json(
        { error: "Dépôt non trouvé" },
        { status: 404 }
      );
    }

    const deposit = depositSnapshot.val();

    // 4. Si déjà complété ou échoué, retourner le statut local
    if (deposit.status === "completed" || deposit.status === "failed") {
      return NextResponse.json({
        success: true,
        deposit: {
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          referenceId: deposit.referenceId,
          completedAt: deposit.completedAt,
          failedAt: deposit.failedAt,
          failureReason: deposit.failureReason
        }
      });
    }

    // 5. Si pending, vérifier le statut auprès de MonCash
    try {
      const moncashStatus = await getPaymentStatus(referenceId);

      console.log("[DEPOSIT_STATUS] Statut MonCash:", moncashStatus);

      // 6. Mettre à jour le statut local si MonCash a changé
      if (moncashStatus.status === "completed" && deposit.status !== "completed") {
        const completion = await completeMonCashDeposit({
          reference: deposit.referenceId || referenceId,
          amountFromWebhook: Number(deposit.amount),
          completedAt: moncashStatus.completedAt ?? undefined,
          verifyWithMonCashApi: false,
        });

        if (!completion.ok && !completion.retryable) {
          console.error("[DEPOSIT_STATUS] Échec finalisation dépôt:", completion.message);
        }

        const refreshed = await depositRef.once("value");
        const updated = refreshed.val() ?? deposit;

        return NextResponse.json({
          success: true,
          deposit: {
            id: updated.id,
            amount: updated.amount,
            status: updated.status,
            referenceId: updated.referenceId,
            completedAt: updated.completedAt,
            netAmount: updated.netAmount,
          },
        });
      }

      if (moncashStatus.status === "failed" && deposit.status !== "failed") {
        await depositRef.update({
          status: "failed",
          failureReason: moncashStatus.failureReason,
          failedAt: moncashStatus.failedAt ? new Date(moncashStatus.failedAt).getTime() : Date.now()
        });

        return NextResponse.json({
          success: true,
          deposit: {
            id: deposit.id,
            amount: deposit.amount,
            status: "failed",
            referenceId: deposit.referenceId,
            failedAt: moncashStatus.failedAt ? new Date(moncashStatus.failedAt).getTime() : Date.now(),
            failureReason: moncashStatus.failureReason
          }
        });
      }

      // 7. Retourner le statut actuel
      return NextResponse.json({
        success: true,
        deposit: {
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          referenceId: deposit.referenceId,
          expiresAt: deposit.expiresAt
        }
      });

    } catch (moncashError) {
      console.error("[DEPOSIT_STATUS] Erreur MonCash:", moncashError);

      // En cas d'erreur MonCash, retourner le statut local
      return NextResponse.json({
        success: true,
        deposit: {
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          referenceId: deposit.referenceId,
          expiresAt: deposit.expiresAt
        }
      });
    }

  } catch (error) {
    console.error("[DEPOSIT_STATUS] Erreur:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la vérification du statut",
        success: false
      },
      { status: 500 }
    );
  }
}
