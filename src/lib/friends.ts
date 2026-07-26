import {
  ref,
  push,
  set,
  get,
} from "firebase/database";

import {
  database,
} from "@/lib/firebase";


// ======================================================
// TYPES
// ======================================================

export type FriendStatus =
  | "none"
  | "pending"
  | "friend";


// ======================================================
// ENVOYER UNE DEMANDE D'AMI
// ======================================================

export async function sendFriendRequest(
  fromUid: string,
  toUid: string
) {

  if (!fromUid) {
    throw new Error(
      "Utilisateur expéditeur introuvable."
    );
  }

  if (!toUid) {
    throw new Error(
      "Utilisateur destinataire introuvable."
    );
  }

  if (fromUid === toUid) {
    throw new Error(
      "Vous ne pouvez pas vous ajouter vous-même."
    );
  }


  // ==================================================
  // VÉRIFIER SI DÉJÀ AMIS
  // ==================================================

  const friendshipRef = ref(
    database,
    `vylo/friendships/${fromUid}/${toUid}`
  );

  const friendshipSnapshot =
    await get(friendshipRef);


  if (friendshipSnapshot.exists()) {

    return {
      success: false,
      status: "friend" as FriendStatus,
      message: "Vous êtes déjà amis.",
    };

  }


  // ==================================================
  // VÉRIFIER UNE DEMANDE EXISTANTE
  // ==================================================

  const requestsRef = ref(
    database,
    "vylo/friendRequests"
  );

  const requestsSnapshot =
    await get(requestsRef);

  const requestsData =
    requestsSnapshot.val();


  if (requestsData) {

    const existingRequest =
      Object.entries(requestsData).find(
        ([, value]: any) => {

          if (!value) {
            return false;
          }

          // Demande déjà envoyée
          if (
            value.from === fromUid &&
            value.to === toUid &&
            value.status === "pending"
          ) {
            return true;
          }

          // L'autre utilisateur a déjà envoyé
          if (
            value.from === toUid &&
            value.to === fromUid &&
            value.status === "pending"
          ) {
            return true;
          }

          return false;

        }
      );


    if (existingRequest) {

      const [
        requestId,
        request
      ] = existingRequest as [
        string,
        any
      ];


      // Demande envoyée par moi
      if (
        request.from === fromUid
      ) {

        return {
          success: false,
          status: "pending" as FriendStatus,
          requestId,
          message:
            "Demande déjà envoyée.",
        };

      }


      // Demande reçue de l'autre utilisateur
      return {
        success: false,
        status: "pending" as FriendStatus,
        requestId,
        message:
          "Cette personne vous a déjà envoyé une demande.",
      };

    }

  }


  // ==================================================
  // RÉCUPÉRER LE NOM DE L'EXPÉDITEUR
  // ==================================================

  let senderUsername =
    "Joueur";


  try {

    const userSnapshot =
      await get(
        ref(
          database,
          `users/${fromUid}`
        )
      );


    if (userSnapshot.exists()) {

      const userData =
        userSnapshot.val();


      senderUsername =
        userData?.username ||
        userData?.name ||
        "Joueur";

    }

  } catch (error) {

    console.warn(
      "Impossible de récupérer le profil utilisateur.",
      error
    );

  }


  // ==================================================
  // CRÉER LA DEMANDE
  // ==================================================

  const requestRef =
    push(
      ref(
        database,
        "vylo/friendRequests"
      )
    );


  const requestId =
    requestRef.key;


  if (!requestId) {

    throw new Error(
      "Impossible de créer la demande d'ami."
    );

  }


  const now =
    Date.now();


  await set(
    requestRef,
    {

      id:
        requestId,

      from:
        fromUid,

      to:
        toUid,

      senderUid:
        fromUid,

      receiverUid:
        toUid,

      senderUsername,

      status:
        "pending",

      createdAt:
        now,

    }
  );


  // ==================================================
  // CRÉER LA NOTIFICATION
  // ==================================================

  const notificationRef =
    push(
      ref(
        database,
        `notifications/${toUid}`
      )
    );


  const notificationId =
    notificationRef.key;


  if (notificationId) {

    await set(
      notificationRef,
      {

        id:
          notificationId,

        type:
          "friend_request",

        title:
          "🤝 Nouvelle demande d'ami",

        message:
          `${senderUsername} veut devenir votre ami.`,

        fromUid:
          fromUid,

        requestId:
          requestId,

        read:
          false,

        createdAt:
          now,

      }
    );

  }


  return {

    success:
      true,

    status:
      "pending" as FriendStatus,

    requestId,

    message:
      "Demande d'ami envoyée.",

  };

}


// ======================================================
// VÉRIFIER LE STATUT D'AMITIÉ
// ======================================================

export async function checkFriendStatus(
  userUid: string,
  friendUid: string
): Promise<FriendStatus> {


  if (!userUid || !friendUid) {

    return "none";

  }


  if (userUid === friendUid) {

    return "friend";

  }


  // ==================================================
  // VÉRIFIER AMITIÉ
  // ==================================================

  const friendshipRef =
    ref(
      database,
      `vylo/friendships/${userUid}/${friendUid}`
    );


  const friendshipSnapshot =
    await get(friendshipRef);


  if (
    friendshipSnapshot.exists()
  ) {

    return "friend";

  }


  // ==================================================
  // VÉRIFIER DEMANDES
  // ==================================================

  const requestsRef =
    ref(
      database,
      "vylo/friendRequests"
    );


  const requestSnapshot =
    await get(requestsRef);


  const data =
    requestSnapshot.val();


  if (!data) {

    return "none";

  }


  const request =
    Object.values(data).find(
      (item: any) => {

        if (!item) {
          return false;
        }


        return (

          (

            item.from === userUid &&

            item.to === friendUid

          )

          ||

          (

            item.from === friendUid &&

            item.to === userUid

          )

        )

        &&

        item.status ===
          "pending";

      }
    );


  if (request) {

    return "pending";

  }


  return "none";

}


// ======================================================
// MARQUER UNE NOTIFICATION COMME LUE
// ======================================================

export async function markNotificationAsRead(
  uid: string,
  notificationId: string
) {

  if (!uid) {
    throw new Error(
      "Utilisateur introuvable."
    );
  }

  if (!notificationId) {
    throw new Error(
      "Notification introuvable."
    );
  }


  await set(
    ref(
      database,
      `notifications/${uid}/${notificationId}/read`
    ),
    true
  );


  return true;

}