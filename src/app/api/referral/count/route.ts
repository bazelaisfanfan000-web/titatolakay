import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getReferralCount } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Non connecté" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const count = await getReferralCount(userId);

    return NextResponse.json({
      success: true,
      count
    });
  } catch (error) {
    console.error("[REFERRAL_COUNT] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
