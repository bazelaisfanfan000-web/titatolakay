import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    
    // 2. Vérifier le token avec Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    const currentUserId = decodedToken.uid;

    // 3. Lire le body
    const body = await req.json();
    const { targetUid } = body;

    if (!targetUid) {
      return NextResponse.json(
        { success: false, error: "UID cible manquant" },
        { status: 400 }
      );
    }

    if (targetUid === currentUserId) {
      return NextResponse.json(
        { success: false, error: "Vous ne pouvez pas vous ajouter en ami" },
        { status: 400 }
      );
    }

    // 4. Récupérer les infos de l'utilisateur actuel
    const userRef = adminDb.ref(`users/${currentUserId}`);
    const userSnapshot = await userRef.once("value");
    
    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const userData = userSnapshot.val();
    const senderUsername = userData.username || "Joueur";
    const senderEmail = userData.email || "";

    // 5. Vérifier si une demande existe déjà
    const existingRequestRef = adminDb.ref("vylo/friendRequests");
    const existingSnapshot = await existingRequestRef.once("value");
    
    if (existingSnapshot.exists()) {
      const requests = existingSnapshot.val();
      for (const requestId in requests) {
        const request = requests[requestId];
        if (
          (request.senderId === currentUserId && request.receiverId === targetUid) ||
          (request.senderId === targetUid && request.receiverId === currentUserId)
        ) {
          return NextResponse.json(
            { success: false, error: "Une demande d'ami existe déjà" },
            { status: 400 }
          );
        }
      }
    }

    // 6. Générer un ID de demande
    const requestId = adminDb.ref("vylo/friendRequests").push().key;

    // 7. Structure de la demande
    const now = Date.now();
    const requestData = {
      id: requestId,
      senderId: currentUserId,
      receiverId: targetUid,
      status: "pending",
      createdAt: now,
      senderUsername,
      senderEmail,
    };

    // 8. Sauvegarder la demande chez le destinataire (pour qu'il puisse la voir)
    const requestRef = adminDb.ref(`vylo/friendRequests/${targetUid}/${requestId}`);
    await requestRef.set(requestData);

    // 9. Envoyer une notification au destinataire
    const notificationRef = adminDb.ref(`notifications/${targetUid}`).push();
    const notificationId = notificationRef.key;
    
    if (notificationId) {
      await notificationRef.set({
        id: notificationId,
        type: "friend_request",
        title: "🤝 Nouvelle demande d'ami",
        message: `${senderUsername} veut devenir votre ami.`,
        fromUid: currentUserId,
        senderId: currentUserId,
        requestId: requestId,
        read: false,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      requestId,
    });

  } catch (error) {
    console.error("Erreur envoi demande d'ami:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur interne" 
      },
      { status: 500 }
    );
  }
}