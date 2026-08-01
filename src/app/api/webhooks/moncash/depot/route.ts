/**
 * API Route: Webhook MonCashConnect
 * POST /api/webhooks/moncash/depot
 * Gère les événements payment.completed, payment.failed, payout.completed, payout.failed
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { constructEvent, MonCashError } from "@moncashconnect/sdk";
import { confirmWithdrawalTransaction, cancelWithdrawalTransaction } from "@/lib/atomicTransaction";
import { creditWallet } from "@/lib/wallet";
import { createDepositLedgerEntry, createWithdrawalLedgerEntry, updateLedgerStatus } from "@/lib/ledger";
import { sanitizeFirebaseKey } from "@/lib/firebaseUtils";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Handler OPTIONS pour CORS preflight
export async function OPTIONS(request: Request) {
  console.log("[WEBHOOK] OPTIONS request received");
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-mcc-signature, x-mcc-timestamp',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// Handler GET pour tester l'accessibilité de l'endpoint
export async function GET(request: Request) {
  console.log("[WEBHOOK] GET request received");
  return NextResponse.json({
    message: "Webhook endpoint is accessible",
    method: "GET",
    note: "MonCashConnect should send POST requests to this endpoint",
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  console.log("[WEBHOOK] POST request received");
  
  try {
    // 1. Lire le corps brut pour vérifier la signature
    const body = await request.text();
    const signature = request.headers.get("x-mcc-signature");
    const timestamp = request.headers.get("x-mcc-timestamp");
    const contentType = request.headers.get("content-type");
    const userAgent = request.headers.get("user-agent");

    console.log("[WEBHOOK] Headers reçus:", {
      signature: signature ? `${signature.substring(0, 20)}...` : 'missing',
      timestamp,
      contentType,
      userAgent,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
      nodeEnv: process.env.NODE_ENV
    });

    // Mode test: si signature absente ET si le corps contient "test"
    // NE PAS dépendre de NODE_ENV car Vercel est en production
    const isTestMode = !signature && body.includes('test');
    
    console.log("[WEBHOOK] Détection mode test:", {
      isTestMode,
      hasSignature: !!signature,
      bodyContainsTest: body.includes('test'),
      nodeEnv: process.env.NODE_ENV
    });
    
    if (isTestMode) {
      console.log("[WEBHOOK] Mode test détecté - retour 200 sans traitement");
      // En mode test, retourner immédiatement 200 sans traiter l'événement
      return NextResponse.json({ 
        success: true, 
        testMode: true,
        message: "Test webhook reçu - endpoint fonctionnel."
      });
    }

    // Si pas de signature mais corps valide, traiter quand même (MonCash n'envoie peut-être pas de signature)
    if (!signature) {
      console.log("[WEBHOOK] Pas de signature mais corps valide - tentative de parsing direct");
      try {
        const parsedBody = JSON.parse(body);
        console.log("[WEBHOOK] Corps parsé:", parsedBody);
        
        // Si le corps a les champs requis, traiter comme événement
        if (parsedBody.event && parsedBody.reference) {
          console.log("[WEBHOOK] Événement valide sans signature - traitement direct");
          const event = parsedBody;
          
          // Vérifier la déduplication
          const safeEventType = sanitizeFirebaseKey(event.event);
          const safeReference = sanitizeFirebaseKey(event.reference);
          const eventId = `${safeEventType}_${safeReference}`;
          const processedEventRef = adminDB.ref(`processed_events/${eventId}`);
          const processedSnapshot = await processedEventRef.once("value");

          if (processedSnapshot.exists()) {
            console.log("[WEBHOOK] Événement déjà traité:", eventId);
            return NextResponse.json({ success: true, message: "Déjà traité" });
          }

          // Traiter l'événement
          const eventType = event.event as string;
          let processingSuccess = false;
          
          try {
            switch (eventType) {
              case "payment.completed":
                await handlePaymentCompleted(event);
                // Vérifier que le traitement a réussi en vérifiant les logs ou le dépôt
                processingSuccess = true;
                break;
              case "payment.failed":
                await handlePaymentFailed(event);
                processingSuccess = true;
                break;
              case "payout.completed":
                await handlePayoutCompleted(event);
                processingSuccess = true;
                break;
              case "payout.failed":
                await handlePayoutFailed(event);
                processingSuccess = true;
                break;
              default:
                console.warn("[WEBHOOK] Type d'événement inconnu:", eventType);
                break;
            }
          } catch (handlerError) {
            console.error("[WEBHOOK] Erreur lors du traitement de l'événement:", handlerError);
            // NE PAS marquer comme traité si erreur - permettre retry
            processingSuccess = false;
          } finally {
            // Marquer comme traité SEULEMENT si succès
            if (processingSuccess) {
              await processedEventRef.set({
                eventId,
                eventType: event.event,
                reference: event.reference,
                timestamp: Date.now(),
                processedAt: Date.now()
              });
            }
          }
          
          return NextResponse.json({ success: true, message: "Traité sans signature" });
        }
      } catch (parseError) {
        console.error("[WEBHOOK] Erreur parsing corps:", parseError);
      }
    }

    if (!signature || !timestamp) {
      console.error("[WEBHOOK] Headers manquants");
      return NextResponse.json(
        { error: "Headers manquants" },
        { status: 400 }
      );
    }

    // 2. Vérifier la signature et construire l'événement avec le SDK officiel
    const webhookSecret = process.env.MONCASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[WEBHOOK] MONCASH_WEBHOOK_SECRET non configuré");
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    let event: any;
    try {
      event = constructEvent(
        Buffer.from(body),
        signature,
        timestamp,
        webhookSecret
      );
    } catch (err) {
      if (err instanceof MonCashError) {
        console.error("[WEBHOOK] Erreur SDK MonCash:", err.message);
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode || 401 }
        );
      }
      console.error("[WEBHOOK] Erreur inconnue:", err);
      return NextResponse.json(
        { error: "Erreur lors du traitement" },
        { status: 500 }
      );
    }

    console.log("[WEBHOOK] Événement reçu:", event);

    // 3. Vérifier la déduplication (anti-replay)
    // Utiliser seulement event.reference qui est unique, pas le timestamp
    const safeEventType = sanitizeFirebaseKey(event.event);
    const safeReference = sanitizeFirebaseKey(event.reference);
    const eventId = `${safeEventType}_${safeReference}`;
    const processedEventRef = adminDB.ref(`processed_events/${eventId}`);
    const processedSnapshot = await processedEventRef.once("value");

    if (processedSnapshot.exists()) {
      console.log("[WEBHOOK] Événement déjà traité:", eventId);
      return NextResponse.json({ success: true, message: "Déjà traité" });
    }

    // 4. Traiter l'événement selon son type
    const eventType = event.event as string;
    let processingSuccess = false;
    
    try {
      switch (eventType) {
        case "payment.completed":
          await handlePaymentCompleted(event);
          processingSuccess = true;
          break;

        case "payment.failed":
          await handlePaymentFailed(event);
          processingSuccess = true;
          break;

        case "payout.completed":
          await handlePayoutCompleted(event);
          processingSuccess = true;
          break;

        case "payout.failed":
          await handlePayoutFailed(event);
          processingSuccess = true;
          break;

        default:
          console.warn("[WEBHOOK] Type d'événement inconnu:", eventType);
          break;
      }
    } finally {
      // 5. Marquer l'événement comme traité APRÈS le traitement (évite race condition)
      if (processingSuccess) {
        await processedEventRef.set({
          eventId,
          eventType: event.event,
          reference: event.reference,
          timestamp,
          processedAt: Date.now()
        });
      }
    }
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[WEBHOOK] Erreur:", error);

    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}

/**
 * Gère payment.completed - Crédite le wallet
 */
async function handlePaymentCompleted(event: any) {
  try {
    const { reference, amount, completedAt } = event;

    console.log("[WEBHOOK] ========== PAYMENT COMPLETED START ==========");
    console.log("[WEBHOOK] Event data:", { reference, amount, completedAt });
    console.log("[WEBHOOK] Event complet:", JSON.stringify(event, null, 2));

    let depositData: any = null;
    let depositUserId: string = "";
    let depositKey: string = "";

    // MÉTHODE PRINCIPALE: Rechercher via deposit_index (index secondaire)
    console.log("[WEBHOOK] Recherche via deposit_index:", reference);
    console.log("[WEBHOOK] Chemin Firebase: deposit_index/", reference);
    
    const indexRef = adminDB.ref(`deposit_index/${reference}`);
    const indexSnapshot = await indexRef.once("value");

    console.log("[WEBHOOK] Résultat recherche deposit_index:", indexSnapshot.exists());

    if (indexSnapshot.exists()) {
      const indexData = indexSnapshot.val();
      console.log("[WEBHOOK] Index trouvé:", {
        userId: indexData.userId,
        depositId: indexData.depositId,
        referenceId: indexData.referenceId,
        moncashReference: indexData.moncashReference,
        amount: indexData.amount,
        status: indexData.status
      });

      // Récupérer le dépôt complet depuis deposits
      const depositRef = adminDB.ref(`deposits/${indexData.userId}/${indexData.depositId}`);
      const depositSnapshot = await depositRef.once("value");

      if (depositSnapshot.exists()) {
        depositData = depositSnapshot.val();
        depositUserId = indexData.userId;
        depositKey = indexData.depositId;
        
        console.log("[WEBHOOK] Dépôt récupéré via index:", {
          depositKey,
          depositUserId,
          depositData: {
            id: depositData.id,
            referenceId: depositData.referenceId,
            moncashReference: depositData.moncashReference,
            amount: depositData.amount,
            status: depositData.status
          }
        });
      } else {
        console.error("[WEBHOOK] Index existe mais dépôt introuvable:", {
          userId: indexData.userId,
          depositId: indexData.depositId
        });
      }
    }

    // FALLBACK: Si index non trouvé, rechercher dans deposits (méthodes précédentes)
    if (!depositData) {
      console.log("[WEBHOOK] Index non trouvé, recherche fallback dans deposits");
      
      const depositsRef = adminDB.ref("deposits");
      
      // Méthode 1: par moncashReference
      const depositSnapshot1 = await depositsRef
        .orderByChild("moncashReference")
        .equalTo(reference)
        .once("value");

      if (depositSnapshot1.exists()) {
        depositSnapshot1.forEach((childSnapshot: any) => {
          const userId = childSnapshot.ref.parent.key;
          const depositId = childSnapshot.key;
          const data = childSnapshot.val();
          
          console.log("[WEBHOOK] Dépôt trouvé via moncashReference (fallback):", { 
            userId, 
            depositId, 
            moncashReference: data.moncashReference,
            referenceId: data.referenceId,
            amount: data.amount,
            status: data.status
          });
          
          depositData = data;
          depositKey = depositId;
          depositUserId = userId;
        });
      }

      // Méthode 2: par id
      if (!depositData) {
        const depositSnapshot2 = await depositsRef
          .orderByChild("id")
          .equalTo(reference)
          .once("value");

        if (depositSnapshot2.exists()) {
          depositSnapshot2.forEach((childSnapshot: any) => {
            const userId = childSnapshot.ref.parent.key;
            const depositId = childSnapshot.key;
            const data = childSnapshot.val();
            
            console.log("[WEBHOOK] Dépôt trouvé via id (fallback):", { 
              userId, 
              depositId, 
              id: data.id,
              referenceId: data.referenceId,
              moncashReference: data.moncashReference,
              amount: data.amount,
              status: data.status
            });
            
            depositData = data;
            depositKey = depositId;
            depositUserId = userId;
          });
        }
      }

      // Méthode 3: par referenceId
      if (!depositData) {
        const depositSnapshot3 = await depositsRef
          .orderByChild("referenceId")
          .equalTo(reference)
          .once("value");

        if (depositSnapshot3.exists()) {
          depositSnapshot3.forEach((childSnapshot: any) => {
            const userId = childSnapshot.ref.parent.key;
            const depositId = childSnapshot.key;
            const data = childSnapshot.val();
            
            console.log("[WEBHOOK] Dépôt trouvé via referenceId (fallback):", { 
              userId, 
              depositId, 
              id: data.id,
              referenceId: data.referenceId,
              moncashReference: data.moncashReference,
              amount: data.amount,
              status: data.status
            });
            
            depositData = data;
            depositKey = depositId;
            depositUserId = userId;
          });
        }
      }
    }

    if (!depositData) {
      console.error("[WEBHOOK] Dépôt non trouvé:", reference);
      console.log("[WEBHOOK] ========== PAYMENT COMPLETED ABORT (DEPÔT NON TROUVÉ) ==========");
      
      // Enregistrer l'événement non traité pour récupération manuelle
      const failedEventPath = `failed_webhook_events/${reference}`;
      const failedEventData = {
        event: "payment.completed",
        reference,
        amount,
        completedAt,
        receivedAt: Date.now(),
        reason: "deposit_not_found",
        attempts: 1
      };

      console.log("[WEBHOOK] Enregistrement de l'événement échoué pour récupération:", failedEventPath);
      await adminDB.ref(failedEventPath).set(failedEventData);

      // Lancer une erreur pour que l'événement ne soit pas marqué comme traité
      throw new Error(`Dépôt non trouvé pour reference: ${reference} - Événement enregistré dans failed_webhook_events`);
    }

    console.log("[WEBHOOK] Dépôt trouvé:", {
      depositKey,
      depositUserId,
      depositData: {
        id: depositData.id,
        amount: depositData.amount,
        status: depositData.status,
        moncashReference: depositData.moncashReference
      }
    });

    // Vérifier que le dépôt est en pending (sécurité)
    if (depositData.status !== "pending") {
      console.warn("[WEBHOOK] Dépôt n'est pas en pending (déjà traité):", { 
        reference, 
        status: depositData.status 
      });
      console.log("[WEBHOOK] ========== PAYMENT COMPLETED ABORT (DÉJÀ TRAITÉ) ==========");
      // Lancer une erreur pour que l'événement ne soit pas marqué comme traité
      throw new Error(`Dépôt déjà traité avec statut: ${depositData.status}`);
    }

    // Vérifier que le montant correspond au montant original
    if (depositData.amount !== amount) {
      console.error("[WEBHOOK] Montant mismatch:", {
        expected: depositData.amount,
        received: amount,
        reference
      });
      console.log("[WEBHOOK] ========== PAYMENT COMPLETED ABORT (MONTANT MISMATCH) ==========");
      // Lancer une erreur pour que l'événement ne soit pas marqué comme traité
      throw new Error(`Montant mismatch: attendu ${depositData.amount}, reçu ${amount}`);
    }

    console.log("[WEBHOOK] Validations OK - Crédit du wallet:", { 
      depositUserId, 
      amount, 
      reference 
    });

    // Récupérer le solde actuel avant crédit
    const userRef = adminDB.ref(`users/${depositUserId}`);
    const userSnapshot = await userRef.once("value");
    const oldBalance = userSnapshot.exists() ? Number(userSnapshot.val()?.balance || 0) : 0;
    
    console.log("[WEBHOOK] Solde avant crédit:", { depositUserId, oldBalance });

    // Transaction atomique: crédit wallet + création wallet_transaction
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    console.log("[WEBHOOK] Début transaction atomique:", { 
      depositUserId, 
      amount, 
      oldBalance,
      transactionId
    });

    const transactionResult = await adminDB.ref(`users/${depositUserId}`).transaction((current: any) => {
      if (!current) {
        console.error("[WEBHOOK] Utilisateur inexistant dans transaction:", depositUserId);
        return; // Annuler
      }

      const currentBalance = Number(current.balance || 0);
      const newBalance = currentBalance + amount;

      console.log("[WEBHOOK] Transaction - Solde calculé:", {
        currentBalance,
        amount,
        newBalance
      });

      return {
        ...current,
        balance: newBalance,
        updatedAt: Date.now()
      };
    });

    if (!transactionResult.committed) {
      console.error("[WEBHOOK] Transaction atomique échouée:", {
        depositUserId,
        amount,
        snapshot: transactionResult.snapshot
      });
      throw new Error("Transaction Firebase échouée - possible conflit concurrent");
    }

    const newBalance = transactionResult.snapshot.val()?.balance || 0;
    console.log("[WEBHOOK] Transaction atomique réussie:", { 
      depositUserId, 
      amount, 
      oldBalance, 
      newBalance 
    });

    // Créer wallet_transaction pour historique
    const walletTransactionPath = `wallet_transactions/${depositUserId}/${transactionId}`;
    const walletTransactionData = {
      type: "deposit",
      amount,
      reference: reference,
      depositId: depositKey,
      status: "completed",
      oldBalance,
      newBalance,
      createdAt: Date.now()
    };

    console.log("[WEBHOOK] Création wallet_transaction:", {
      walletTransactionPath,
      walletTransactionData
    });

    await adminDB.ref(walletTransactionPath).set(walletTransactionData);

    // Vérifier wallet_transaction créé
    const walletTxVerification = await adminDB.ref(walletTransactionPath).once("value");
    if (!walletTxVerification.exists()) {
      console.error("[WEBHOOK] ERREUR: wallet_transaction non créé:", walletTransactionPath);
      // Ne pas bloquer, le crédit est déjà effectué
    } else {
      console.log("[WEBHOOK] wallet_transaction vérifié:", walletTransactionPath);
    }

    // Mettre à jour le dépôt (après transaction réussie)
    const depositRef = adminDB.ref(`deposits/${depositUserId}/${depositKey}`);
    await depositRef.update({
      status: "completed",
      moncashTransactionId: reference,
      netAmount: amount,
      completedAt: new Date(completedAt).getTime()
    });

    console.log("[WEBHOOK] Dépôt mis à jour (completed):", { depositKey });

    // Mettre à jour l'index secondaire
    const indexUpdateRef = adminDB.ref(`deposit_index/${reference}`);
    await indexUpdateRef.update({
      status: "completed",
      completedAt: new Date(completedAt).getTime()
    });

    console.log("[WEBHOOK] Index secondaire mis à jour (completed):", reference);

    // Créer l'entrée ledger
    const ledgerResult = await createDepositLedgerEntry(
      depositUserId,
      amount,
      oldBalance,
      newBalance,
      reference,
      depositKey
    );

    if (!ledgerResult.success) {
      console.error("[WEBHOOK] Erreur création ledger:", ledgerResult.error);
      // Ne pas bloquer, le crédit est déjà effectué
    } else {
      console.log("[WEBHOOK] Ledger créé:", { transactionId: ledgerResult.transactionId });
    }

    console.log("[WEBHOOK] ========== PAYMENT COMPLETED SUCCESS ==========");
    console.log("[WEBHOOK] Résumé:", {
      reference,
      userId: depositUserId,
      amount,
      oldBalance,
      newBalance,
      depositId: depositKey,
      ledgerTransactionId: ledgerResult.transactionId
    });

  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePaymentCompleted:", error);
    console.log("[WEBHOOK] ========== PAYMENT COMPLETED ERROR ==========");
    throw error;
  }
}

/**
 * Gère payment.failed - Marque le dépôt comme échoué
 */
async function handlePaymentFailed(event: any) {
  try {
    const { reference } = event;

    console.log("[WEBHOOK] ========== PAYMENT FAILED START ==========");
    console.log("[WEBHOOK] Event data:", { reference });

    let depositData: any = null;
    let depositUserId: string = "";
    let depositKey: string = "";

    // Méthode 1: Rechercher par moncashReference
    console.log("[WEBHOOK] Recherche par moncashReference:", reference);
    const depositsRef = adminDB.ref("deposits");
    const depositSnapshot = await depositsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    console.log("[WEBHOOK] Résultat recherche moncashReference:", depositSnapshot.exists());

    if (depositSnapshot.exists()) {
      depositSnapshot.forEach((childSnapshot: any) => {
        const userId = childSnapshot.ref.parent.key;
        const depositId = childSnapshot.key;
        const data = childSnapshot.val();
        
        console.log("[WEBHOOK] Dépôt trouvé via moncashReference:", { 
          userId, 
          depositId, 
          moncashReference: data.moncashReference,
          amount: data.amount,
          status: data.status
        });
        
        depositData = data;
        depositKey = depositId;
        depositUserId = userId;
      });
    }

    // Méthode 2: Fallback par referenceId
    if (!depositData) {
      console.log("[WEBHOOK] Recherche par referenceId (fallback):", reference);
      const depositSnapshot2 = await depositsRef
        .orderByChild("id")
        .equalTo(reference)
        .once("value");

      console.log("[WEBHOOK] Résultat recherche referenceId:", depositSnapshot2.exists());

      if (depositSnapshot2.exists()) {
        depositSnapshot2.forEach((childSnapshot: any) => {
          const userId = childSnapshot.ref.parent.key;
          const depositId = childSnapshot.key;
          const data = childSnapshot.val();
          
          console.log("[WEBHOOK] Dépôt trouvé via referenceId:", { 
            userId, 
            depositId, 
            id: data.id,
            amount: data.amount,
            status: data.status
          });
          
          depositData = data;
          depositKey = depositId;
          depositUserId = userId;
        });
      }
    }

    if (!depositData) {
      console.error("[WEBHOOK] Dépôt non trouvé:", reference);
      console.log("[WEBHOOK] ========== PAYMENT FAILED ABORT (DEPÔT NON TROUVÉ) ==========");
      return;
    }

    console.log("[WEBHOOK] Dépôt trouvé:", {
      depositKey,
      depositUserId,
      depositData: {
        id: depositData.id,
        amount: depositData.amount,
        status: depositData.status
      }
    });

    // Vérifier que le dépôt est en pending (sécurité)
    if (depositData.status !== "pending") {
      console.warn("[WEBHOOK] Dépôt n'est pas en pending (déjà traité):", { 
        reference, 
        status: depositData.status 
      });
      console.log("[WEBHOOK] ========== PAYMENT FAILED ABORT (DÉJÀ TRAITÉ) ==========");
      return;
    }

    // Si le dépôt est déjà échoué, ne rien faire
    if (depositData.status === "failed") {
      console.log("[WEBHOOK] Dépôt déjà échoué:", reference);
      console.log("[WEBHOOK] ========== PAYMENT FAILED ABORT (DÉJÀ ÉCHOUÉ) ==========");
      return;
    }

    // Mettre à jour le dépôt
    const depositRef = adminDB.ref(`deposits/${depositUserId}/${depositKey}`);
    await depositRef.update({
      status: "failed",
      failureReason: "Paiement échoué ou expiré",
      failedAt: Date.now()
    });

    console.log("[WEBHOOK] Dépôt marqué comme échoué:", { reference, depositKey });
    console.log("[WEBHOOK] ========== PAYMENT FAILED SUCCESS ==========");

  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePaymentFailed:", error);
    console.log("[WEBHOOK] ========== PAYMENT FAILED ERROR ==========");
    throw error;
  }
}

/**
 * Gère payout.completed - Confirme le retrait
 */
async function handlePayoutCompleted(event: any) {
  try {
    const { reference, amount, completedAt, recipient_account_masked } = event;

    console.log("[WEBHOOK] ========== PAYOUT COMPLETED START ==========");
    console.log("[WEBHOOK] Event data:", { reference, amount, completedAt, recipient_account_masked });

    let withdrawalData: any = null;
    let withdrawalUserId: string = "";
    let withdrawalKey: string = "";

    // Trouver le retrait correspondant
    console.log("[WEBHOOK] Recherche par moncashReference:", reference);
    const withdrawalsRef = adminDB.ref("withdrawals");
    const withdrawalSnapshot = await withdrawalsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    console.log("[WEBHOOK] Résultat recherche moncashReference:", withdrawalSnapshot.exists());

    if (!withdrawalSnapshot.exists()) {
      console.error("[WEBHOOK] Retrait non trouvé:", reference);
      console.log("[WEBHOOK] ========== PAYOUT COMPLETED ABORT (RETRAIT NON TROUVÉ) ==========");
      return;
    }

    withdrawalSnapshot.forEach((childSnapshot: any) => {
      const userId = childSnapshot.ref.parent.key;
      const withdrawalId = childSnapshot.key;
      const data = childSnapshot.val();
      
      console.log("[WEBHOOK] Retrait trouvé:", { 
        userId, 
        withdrawalId, 
        moncashReference: data.moncashReference,
        amount: data.amount,
        status: data.status
      });
      
      withdrawalData = data;
      withdrawalKey = withdrawalId;
      withdrawalUserId = userId;
    });

    console.log("[WEBHOOK] Retrait trouvé:", {
      withdrawalKey,
      withdrawalUserId,
      withdrawalData: {
        id: withdrawalData.id,
        amount: withdrawalData.amount,
        status: withdrawalData.status
      }
    });

    // Vérifier que le retrait est en pending (sécurité)
    if (withdrawalData.status !== "pending") {
      console.warn("[WEBHOOK] Retrait n'est pas en pending (déjà traité):", { 
        reference, 
        status: withdrawalData.status 
      });
      console.log("[WEBHOOK] ========== PAYOUT COMPLETED ABORT (DÉJÀ TRAITÉ) ==========");
      return;
    }

    // Si le retrait est déjà complété, ne rien faire
    if (withdrawalData.status === "completed") {
      console.log("[WEBHOOK] Retrait déjà complété:", reference);
      console.log("[WEBHOOK] ========== PAYOUT COMPLETED ABORT (DÉJÀ COMPLÉTÉ) ==========");
      return;
    }

    // Vérifier que le montant correspond au montant original
    if (withdrawalData.amount !== amount) {
      console.error("[WEBHOOK] Montant mismatch retrait:", {
        expected: withdrawalData.amount,
        received: amount,
        reference
      });
      console.log("[WEBHOOK] ========== PAYOUT COMPLETED ABORT (MONTANT MISMATCH) ==========");
      return;
    }

    console.log("[WEBHOOK] Validations OK - Confirmation retrait:", { 
      withdrawalUserId, 
      amount, 
      reference 
    });

    // Confirmer le retrait (débit + déverrouillage)
    const confirmResult = await confirmWithdrawalTransaction({
      userId: withdrawalUserId,
      amount: withdrawalData.amount,
      referenceId: withdrawalData.id,
      moncashReference: reference
    });

    if (!confirmResult.success) {
      console.error("[WEBHOOK] Erreur confirmation retrait:", confirmResult.error);
      console.log("[WEBHOOK] ========== PAYOUT COMPLETED ABORT (CONFIRMATION ÉCHOUÉE) ==========");
      return;
    }

    console.log("[WEBHOOK] Retrait confirmé avec succès:", { 
      withdrawalUserId, 
      amount, 
      newBalance: confirmResult.newBalance 
    });

    // Mettre à jour le retrait
    const withdrawalRef = adminDB.ref(`withdrawals/${withdrawalUserId}/${withdrawalKey}`);
    await withdrawalRef.update({
      status: "completed",
      completedAt: new Date(completedAt).getTime()
    });

    console.log("[WEBHOOK] Retrait mis à jour (completed):", { withdrawalKey });

    // Créer l'entrée ledger
    const ledgerResult = await createWithdrawalLedgerEntry(
      withdrawalUserId,
      amount,
      confirmResult.newBalance! + amount,
      confirmResult.newBalance!,
      reference,
      withdrawalKey
    );

    if (!ledgerResult.success) {
      console.error("[WEBHOOK] Erreur création ledger:", ledgerResult.error);
      // Ne pas bloquer, le retrait est déjà confirmé
    } else {
      console.log("[WEBHOOK] Ledger créé:", { transactionId: ledgerResult.transactionId });
    }

    console.log("[WEBHOOK] ========== PAYOUT COMPLETED SUCCESS ==========");
    console.log("[WEBHOOK] Résumé:", {
      reference,
      userId: withdrawalUserId,
      amount,
      newBalance: confirmResult.newBalance,
      withdrawalId: withdrawalKey,
      ledgerTransactionId: ledgerResult.transactionId
    });

  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePayoutCompleted:", error);
    console.log("[WEBHOOK] ========== PAYOUT COMPLETED ERROR ==========");
    throw error;
  }
}

/**
 * Gère payout.failed - Annule le retrait et déverrouille
 */
async function handlePayoutFailed(event: any) {
  try {
    const { reference, failureReason } = event;

    console.log("[WEBHOOK] ========== PAYOUT FAILED START ==========");
    console.log("[WEBHOOK] Event data:", { reference, failureReason });

    let withdrawalData: any = null;
    let withdrawalUserId: string = "";
    let withdrawalKey: string = "";

    // Trouver le retrait correspondant
    console.log("[WEBHOOK] Recherche par moncashReference:", reference);
    const withdrawalsRef = adminDB.ref("withdrawals");
    const withdrawalSnapshot = await withdrawalsRef
      .orderByChild("moncashReference")
      .equalTo(reference)
      .once("value");

    console.log("[WEBHOOK] Résultat recherche moncashReference:", withdrawalSnapshot.exists());

    if (!withdrawalSnapshot.exists()) {
      console.error("[WEBHOOK] Retrait non trouvé:", reference);
      console.log("[WEBHOOK] ========== PAYOUT FAILED ABORT (RETRAIT NON TROUVÉ) ==========");
      return;
    }

    withdrawalSnapshot.forEach((childSnapshot: any) => {
      const userId = childSnapshot.ref.parent.key;
      const withdrawalId = childSnapshot.key;
      const data = childSnapshot.val();
      
      console.log("[WEBHOOK] Retrait trouvé:", { 
        userId, 
        withdrawalId, 
        moncashReference: data.moncashReference,
        amount: data.amount,
        status: data.status
      });
      
      withdrawalData = data;
      withdrawalKey = withdrawalId;
      withdrawalUserId = userId;
    });

    console.log("[WEBHOOK] Retrait trouvé:", {
      withdrawalKey,
      withdrawalUserId,
      withdrawalData: {
        id: withdrawalData.id,
        amount: withdrawalData.amount,
        status: withdrawalData.status
      }
    });

    // Vérifier que le retrait est en pending (sécurité)
    if (withdrawalData.status !== "pending") {
      console.warn("[WEBHOOK] Retrait n'est pas en pending (déjà traité):", { 
        reference, 
        status: withdrawalData.status 
      });
      console.log("[WEBHOOK] ========== PAYOUT FAILED ABORT (DÉJÀ TRAITÉ) ==========");
      return;
    }

    // Si le retrait est déjà échoué, ne rien faire
    if (withdrawalData.status === "failed") {
      console.log("[WEBHOOK] Retrait déjà échoué:", reference);
      console.log("[WEBHOOK] ========== PAYOUT FAILED ABORT (DÉJÀ ÉCHOUÉ) ==========");
      return;
    }

    console.log("[WEBHOOK] Validations OK - Annulation retrait avec remboursement:", { 
      withdrawalUserId, 
      amount: withdrawalData.amount, 
      reference 
    });

    // Annuler le retrait (déverrouillage sans débit)
    const cancelResult = await cancelWithdrawalTransaction({
      userId: withdrawalUserId,
      amount: withdrawalData.amount,
      referenceId: withdrawalData.id,
      failureReason: failureReason || "Retrait échoué"
    });

    if (!cancelResult.success) {
      console.error("[WEBHOOK] Erreur annulation retrait:", cancelResult.error);
      console.log("[WEBHOOK] ========== PAYOUT FAILED ABORT (ANNULATION ÉCHOUÉE) ==========");
      return;
    }

    console.log("[WEBHOOK] Retrait annulé avec remboursement:", { 
      withdrawalUserId, 
      amount: withdrawalData.amount, 
      newBalance: cancelResult.newBalance 
    });

    // Mettre à jour le retrait
    const withdrawalRef = adminDB.ref(`withdrawals/${withdrawalUserId}/${withdrawalKey}`);
    await withdrawalRef.update({
      status: "failed",
      failureReason: failureReason || "Retrait échoué",
      failedAt: Date.now()
    });

    console.log("[WEBHOOK] Retrait mis à jour (failed):", { withdrawalKey });

    console.log("[WEBHOOK] ========== PAYOUT FAILED SUCCESS ==========");
    console.log("[WEBHOOK] Résumé:", {
      reference,
      userId: withdrawalUserId,
      amount: withdrawalData.amount,
      newBalance: cancelResult.newBalance,
      withdrawalId: withdrawalKey,
      failureReason
    });

  } catch (error) {
    console.error("[WEBHOOK] Erreur dans handlePayoutFailed:", error);
    console.log("[WEBHOOK] ========== PAYOUT FAILED ERROR ==========");
    throw error;
  }
}
