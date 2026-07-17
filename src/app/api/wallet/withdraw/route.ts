import { NextResponse } from "next/server";

import { adminDB } from "@/lib/firebaseAdmin";

import { createMonCashPayout } from "@/lib/moncash";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { uid, amount, moncashNumber } = body;

    if (!uid || !amount || !moncashNumber) {
      return NextResponse.json({ error: "Informations manquantes" }, { status: 400 });
    }

    const withdrawAmount = Number(amount);

    if (withdrawAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // lire solde utilisateur
    const balanceRef = adminDB.ref(`users/${uid}/balance`);
    const balanceSnap = await balanceRef.get();
    const balance = balanceSnap.exists() ? Number(balanceSnap.val() || 0) : 0;

    if (!balanceSnap.exists()) {
      return NextResponse.json({ error: "Solde introuvable" }, { status: 404 });
    }

    if (balance < withdrawAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // référence retrait
    const reference = "withdraw_" + Date.now() + "_" + uid.substring(0, 8);

    // débiter le solde atomiquement
    let deducted = false;
    let oldBalance = 0;
    let newBalance = 0;

    await balanceRef.transaction((current: any) => {
      oldBalance = Number(current || 0);
      if (oldBalance < withdrawAmount) return current;
      newBalance = oldBalance - withdrawAmount;
      deducted = true;
      return newBalance;
    });

    if (!deducted) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // enregistrer demande
    await adminDB.ref(`withdrawals/${reference}`).set({
      uid,
      amount: withdrawAmount,
      moncashNumber,
      reference,
      status: "pending",
      createdAt: Date.now()
    });

    // enregistrer transaction pending
    await adminDB.ref(`transactions/${uid}`).push({
      type: "withdraw_request",
      amount: -withdrawAmount,
      oldBalance,
      newBalance,
      status: "pending",
      createdAt: Date.now()
    });

    // appel MonCash payout
    const payout = await createMonCashPayout(withdrawAmount, moncashNumber, reference);

    return NextResponse.json({ success: true, reference, payout });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur retrait" }, { status: 500 });
  }
}
