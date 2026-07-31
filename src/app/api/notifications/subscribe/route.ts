import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminAuth } from "@/lib/firebaseAdmin";

/*
====================================================
API ROUTE: S'ABONNER AUX NOTIFICATIONS TOPICS
====================================================

POST /api/notifications/subscribe

Body:
{
  "topic": string (ex: "new-games")
}

Permet à un utilisateur de s'abonner à un topic Firebase
pour recevoir des notifications push même quand l'app est fermée.
*/

export async function POST(request: Request) {
  try {
    /*
    ====================================================
    1. VÉRIFIER FIREBASE ADMIN
    ====================================================
    */

    if (!adminAuth) {
      console.error("SUBSCRIBE: Firebase Admin non initialisé");
      return NextResponse.json(
        {
          success: false,
          error: "Service Firebase non disponible. Réessayez plus tard.",
        },
        {
          status: 503,
        }
      );
    }

    /*
    ====================================================
    2. LIRE LES DONNÉES
    ====================================================
    */

    const body = await request.json();
    const { topic } = body;

    /*
    ====================================================
    3. VALIDATION
    ====================================================
    */

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Topic requis",
        },
        {
          status: 400,
        }
      );
    }

    // Topics autorisés
    const allowedTopics = ["new-games", "all-games", "high-stakes"];
    if (!allowedTopics.includes(topic)) {
      return NextResponse.json(
        {
          success: false,
          error: "Topic non autorisé",
        },
        {
          status: 400,
        }
      );
    }

    /*
    ====================================================
    4. AUTHORIZATION HEADER
    ====================================================
    */

    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Token manquant",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token vide",
        },
        {
          status: 401,
        }
      );
    }

    /*
    ====================================================
    5. VÉRIFIER TOKEN FIREBASE
    ====================================================
    */

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error("FIREBASE AUTH ERROR:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Token Firebase invalide",
        },
        {
          status: 401,
        }
      );
    }

    const uid = decoded.uid;

    console.log("SUBSCRIBE:", {
      uid,
      topic,
    });

    /*
    ====================================================
    6. INSTRUCTIONS POUR LE CLIENT
    ====================================================
    */

    // Note: L'abonnement au topic doit être fait côté client
    // avec Firebase Messaging SDK. Cette API sert uniquement
    // à valider et enregistrer la préférence de l'utilisateur.

    // Enregistrer la préférence dans Firebase
    const { adminDB } = await import("@/lib/firebaseAdmin");

    await adminDB.ref(`users/${uid}/notificationPreferences/${topic}`).set({
      subscribed: true,
      subscribedAt: Date.now(),
    });

    console.log("SUBSCRIBE: Préférence enregistrée pour", uid, topic);

    /*
    ====================================================
    7. SUCCÈS
    ====================================================
    */

    return NextResponse.json(
      {
        success: true,
        message: "Préférence enregistrée. Utilisez le SDK client pour vous abonner.",
        topic,
        clientInstructions: {
          action: "subscribeToTopic",
          topic,
          // Le client doit appeler: messaging.subscribeToTopic(topic)
        },
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("SUBSCRIBE_ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'abonnement",
      },
      {
        status: 500,
      }
    );
  }
}
