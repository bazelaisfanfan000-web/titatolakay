import { NextResponse } from "next/server";
import { envoyerEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email requis" },
        { status: 400 }
      );
    }

    console.log("Test email à:", email);
    console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "Configuré" : "NON CONFIGURÉ");

    const result = await envoyerEmail("TestUser", 100, email);

    return NextResponse.json({
      success: result,
      message: result ? "Email envoyé avec succès" : "Échec de l'envoi"
    });
  } catch (error: any) {
    console.error("Erreur test email:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
