/**
 * API Route: Cron Job - Vérification des dépôts en attente
 * GET /api/cron/check-deposits
 * Polling pour les dépôts dont le webhook n'a pas fonctionné
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { getPaymentStatus } from "@/lib/moncash";
import { creditWallet } from "@/lib/wallet";
import { createDepositLedgerEntry } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maximum age for pending deposits (1 hour)
const MAX_PENDING_AGE = 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    console.log("[CRON] Début vérification dépôts en attente");

    // Récupérer tous les dépôts en attente
    const depositsRef = adminDB.ref("deposits");
    const depositsSnapshot = await depositsRef.once("value");

    if (!depositsSnapshot.exists()) {
      console.log("[CRON] Aucun dépôt trouvé");
      return NextResponse.json({
        success: true,
        message: "Aucun dépôt à vérifier",
        processed: 0
      });
    }

    let processedCount = 0;
    let creditedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Parcourir tous les utilisateurs
    depositsSnapshot.forEach((userSnapshot: any) => {
      const userId = userSnapshot.key;
      const userDeposits = userSnapshot.val();

      // Parcourir les dépôts de cet utilisateur
      Object.entries(userDeposits).forEach(([depositId, depositData]: [string, any]) => {
        const deposit = depositData as any;

        // Ignorer les dépôts déjà traités
        if (deposit.status !== "pending") {
          return;
        }

        // Vérifier si le dépôt n'est pas trop vieux
        const age = Date.now() - deposit.createdAt;
        if (age > MAX_PENDING_AGE) {
          console.log("[CRON] Dépôt trop vieux, ignoré:", { depositId, age });
          return;
        }

        processedCount++;

        // Vérifier le statut auprès de MonCash
        checkDepositStatus(userId, depositId, deposit)
          .then((result) => {
            if (result.success) {
              creditedCount++;
              console.log("[CRON] Dépôt crédité:", { depositId, userId, amount: deposit.amount });
            } else {
              failedCount++;
              console.error("[CRON] Échec vérification dépôt:", { depositId, error: result.error });
            }
            results.push({ depositId, userId, result });
          })
          .catch((error) => {
            failedCount++;
            console.error("[CRON] Erreur vérification dépôt:", { depositId, error });
            results.push({ depositId, userId, error: error.message });
          });
      });
    });

    // Attendre que toutes les vérifications soient terminées
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("[CRON] Vérification terminée:", {
      processed: processedCount,
      credited: creditedCount,
      failed: failedCount
    });

    return NextResponse.json({
      success: true,
      message: "Vérification terminée",
      processed: processedCount,
      credited: creditedCount,
      failed: failedCount,
      results
    });

  } catch (error) {
    console.error("[CRON] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la vérification des dépôts",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Vérifie le statut d'un dépôt auprès de MonCash
 */
async function checkDepositStatus(
  userId: string,
  depositId: string,
  depositData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[CRON] Vérification dépôt:", { depositId, moncashReference: depositData.moncashReference });

    // Vérifier le statut auprès de MonCash
    const status = await getPaymentStatus(depositData.moncashReference);

    console.log("[CRON] Statut MonCash:", { depositId, status });

    // Si le paiement est complété, créditer le wallet
    if (status.status === "completed") {
      const creditResult = await creditWallet(
        userId,
        depositData.amount,
        depositData.moncashReference,
        "Dépôt MonCash complété (polling)"
      );

      if (!creditResult.success) {
        return { success: false, error: creditResult.error };
      }

      // Mettre à jour le dépôt
      const depositRef = adminDB.ref(`deposits/${userId}/${depositId}`);
      await depositRef.update({
        status: "completed",
        moncashTransactionId: depositData.moncashReference,
        netAmount: depositData.amount,
        completedAt: Date.now(),
        completedBy: "cron"
      });

      // Créer l'entrée ledger
      await createDepositLedgerEntry(
        userId,
        depositData.amount,
        creditResult.balance! - depositData.amount,
        creditResult.balance!,
        depositData.moncashReference,
        depositId
      );

      return { success: true };
    }

    // Si le paiement a échoué
    if (status.status === "failed") {
      const depositRef = adminDB.ref(`deposits/${userId}/${depositId}`);
      await depositRef.update({
        status: "failed",
        failureReason: "Paiement échoué (polling)",
        failedAt: Date.now()
      });

      return { success: false, error: "Paiement échoué" };
    }

    // Paiement encore en attente
    return { success: false, error: "Paiement encore en attente" };

  } catch (error) {
    console.error("[CRON] Erreur vérification dépôt:", { depositId, error });
    
    // Si l'API MonCash échoue, essayer de trouver le dépôt par referenceId comme fallback
    try {
      console.log("[CRON] Tentative fallback par referenceId");
      const status2 = await getPaymentStatus(depositData.id);
      
      if (status2.status === "completed") {
        const creditResult = await creditWallet(
          userId,
          depositData.amount,
          depositData.id,
          "Dépôt MonCash complété (polling fallback)"
        );

        if (!creditResult.success) {
          return { success: false, error: creditResult.error };
        }

        const depositRef = adminDB.ref(`deposits/${userId}/${depositId}`);
        await depositRef.update({
          status: "completed",
          moncashTransactionId: depositData.id,
          netAmount: depositData.amount,
          completedAt: Date.now(),
          completedBy: "cron-fallback"
        });

        await createDepositLedgerEntry(
          userId,
          depositData.amount,
          creditResult.balance! - depositData.amount,
          creditResult.balance!,
          depositData.id,
          depositId
        );

        return { success: true };
      }
    } catch (fallbackError) {
      console.error("[CRON] Erreur fallback:", { depositId, fallbackError });
    }
    
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
