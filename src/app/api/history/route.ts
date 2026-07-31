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

    // Récupérer les transactions de l'utilisateur
    const transactionsRef = adminDB.ref(`transactions/${uid}`);
    const snapshot = await transactionsRef.once("value");
    const transactions = snapshot.val();

    if (!transactions) {
      return NextResponse.json({
        success: true,
        history: []
      });
    }

    // Convertir en tableau et trier par date (plus récent en premier)
    const historyArray = Object.entries(transactions).map(([key, value]: [string, any]) => ({
      id: key,
      ...value
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      success: true,
      history: historyArray
    });

  } catch (error) {
    console.error("[HISTORY_API] Erreur:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la récupération de l'historique"
    }, { status: 500 });
  }
}
