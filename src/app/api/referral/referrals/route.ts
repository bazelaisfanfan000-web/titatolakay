import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getReferrals } from "@/lib/referral";

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

    const referrals = await getReferrals(userId);

    return NextResponse.json({
      success: true,
      referrals
    });
  } catch (error) {
    console.error("[REFERRAL_LIST] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
