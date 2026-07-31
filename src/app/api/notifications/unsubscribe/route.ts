import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminAuth } from "@/lib/firebaseAdmin";

/*
====================================================
API ROUTE: SE DÉSABONNER DES NOTIFICATIONS TOPICS
====================================================

POST /api/notifications/unsubscribe

Body:
{
  "topic": string (ex: "new-games")
}

Permet à un utilisateur de se désabonner d'un topic Firebase.
*/

export async function POST(request: Request) {
  try {
    /*
    ====================================================
    1. VÉRIFIER FIREBASE ADMIN
    ====================================================
    */

    if (!adminAuth) {
      console.error("UNSUBSCRIBE: Firebase Admin non initialisé");
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

    console.log("UNSUBSCRIBE:", {
      uid,
      topic,
    });

    /*
    ====================================================
    6. ENREGISTRER LA PRÉFÉRENCE
    ====================================================
    */

    const { adminDB } = await import("@/lib/firebaseAdmin");

    await adminDB.ref(`users/${uid}/notificationPreferences/${topic}`).set({
      subscribed: false,
      unsubscribedAt: Date.now(),
    });

    console.log("UNSUBSCRIBE: Préférence enregistrée pour", uid, topic);

    /*
    ====================================================
    7. SUCCÈS
    ====================================================
    */

    return NextResponse.json(
      {
        success: true,
        message: "Préférence enregistrée. Utilisez le SDK client pour vous désabonner.",
        topic,
        clientInstructions: {
          action: "unsubscribeFromTopic",
          topic,
          // Le client doit appeler: messaging.unsubscribeFromTopic(topic)
        },
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("UNSUBSCRIBE_ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du désabonnement",
      },
      {
        status: 500,
      }
    );
  }
}
