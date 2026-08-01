/**
 * API Route: Lookup referral code
 * GET /api/referral/lookup?code=ABC123
 */

import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { getReferrerByCode } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Code manquant" },
        { status: 400 }
      );
    }

    // Valider le format du code (8 caractères alphanumériques)
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Code invalide" },
        { status: 400 }
      );
    }

    const referrerId = await getReferrerByCode(code);

    if (!referrerId) {
      return NextResponse.json(
        { success: false, error: "Code introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      referrerId
    });
  } catch (error) {
    console.error("[REFERRAL_LOOKUP] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
