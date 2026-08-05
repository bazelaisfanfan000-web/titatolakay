import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        error: "Non authentifié"
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Récupérer les données wagering de l'utilisateur
    const userSnap = await adminDB.ref(`users/${uid}`).once("value");

    if (!userSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: "Utilisateur non trouvé"
      }, { status: 404 });
    }

    const user = userSnap.val();

    const balance = Number(user.balance || 0);
    const totalWagered = Number(user.totalWagered || 0);
    const wageringGoal = Number(user.wageringGoal || 0);
    const withdrawalsUnlocked = user.withdrawalsUnlocked === true;

    return NextResponse.json({
      success: true,
      balance,
      totalWagered,
      wageringGoal,
      withdrawalsUnlocked,
    });

  } catch (error) {
    console.error("[WAGERING_STATUS_API] Erreur:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la récupération du statut wagering"
    }, { status: 500 });
  }
}
