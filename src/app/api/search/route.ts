import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Si tu n'as pas firebase-admin configuré, on peut utiliser l'API REST directement
// Je te propose une solution qui utilise les appels REST pour éviter les dépendances

export async function GET(req: NextRequest) {
  try {
    // 1. Récupérer le token d'authentification
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    
    // 2. Vérifier le token (optionnel, mais recommandé)
    // Si tu as Firebase Admin SDK :
    // const decodedToken = await adminAuth.verifyIdToken(token);
    // const userId = decodedToken.uid;
    
    // 3. Récupérer le paramètre de recherche
    const searchQuery = req.nextUrl.searchParams.get("q") || "";
    const trimmedQuery = searchQuery.trim().toLowerCase();

    if (trimmedQuery.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    // 4. Récupérer tous les utilisateurs depuis Firebase
    // ⚠️ ATTENTION : Pour un gros volume, il faut indexer !
    const usersRef = adminDb.ref("users");
    const snapshot = await usersRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    const usersData = snapshot.val();
    const results = [];
    const seenUids = new Set<string>();

    console.log("[SEARCH] Recherche pour:", trimmedQuery);
    console.log("[SEARCH] Nombre total d'utilisateurs:", Object.keys(usersData).length);

    // 5. Filtrer par nom ou email
    for (const [uid, user] of Object.entries(usersData)) {
      // Éviter les doublons
      if (seenUids.has(uid)) {
        console.log("[SEARCH] UID déjà vu, skip:", uid);
        continue;
      }
      seenUids.add(uid);

      const userData = user as any;
      const username = userData.username || "";
      const email = userData.email || "";
      
      const matchesUsername = username.toLowerCase().includes(trimmedQuery);
      const matchesEmail = email.toLowerCase().includes(trimmedQuery);

      if (matchesUsername || matchesEmail) {
        console.log("[SEARCH] Match trouvé:", uid, username, email);
        results.push({
          uid,
          username,
          email,
          online: userData.online || false,
          lastSeen: userData.lastSeen || null,
        });
      }

      // Limiter à 20 résultats pour éviter la surcharge
      if (results.length >= 20) break;
    }

    console.log("[SEARCH] Résultats finaux:", results.length);
    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("Erreur recherche utilisateur:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur interne du serveur" 
      },
      { status: 500 }
    );
  }
}