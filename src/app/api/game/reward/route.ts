import {
  NextResponse
} from "next/server";

import {
  adminAuth
} from "@/lib/firebaseAdmin";

import {
  processGameReward
} from "@/lib/gameRewardSystem";





export async function POST(request:Request){
  console.log("📡 API GAME REWARD START");

  try{
    const body = await request.json();
    const { gameId } = body;

    if(!gameId){
      console.error("❌ GameId manquant");
      return NextResponse.json(
        { error: "GameId manquant" },
        { status: 400 }
      );
    }

    // Authentification
    const authHeader = request.headers.get("authorization");
    if(!authHeader){
      console.error("❌ Non connecté");
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    console.log("👤 Utilisateur authentifié", { uid, gameId });

    // Appeler processGameReward
    const result = await processGameReward(gameId);

    console.log("✅ API GAME REWARD SUCCESS", result);

    return NextResponse.json(result);

  }catch(error:any){
    console.error("❌ API GAME REWARD ERROR", {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: error.message || "Erreur serveur",
        success: false
      },
      { status: 500 }
    );
  }
}
