import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que le token est valide (optionnel mais recommandé)
    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 401 }
      );
    }

    // Créer la réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      message: "Cookie défini avec succès"
    });

    // Définir le cookie sécurisé
    response.cookies.set({
      name: "firebase-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[SET-COOKIE] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}