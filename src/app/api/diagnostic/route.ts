import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    resend_api_key: process.env.RESEND_API_KEY ? "Configurée" : "NON CONFIGURÉE",
    resend_api_key_length: process.env.RESEND_API_KEY?.length || 0,
    firebase_url: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? "Configurée" : "NON CONFIGURÉE",
  });
}
