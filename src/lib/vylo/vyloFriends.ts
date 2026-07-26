import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";

import {
  database,
} from "@/lib/firebase";


/*
========================================
TYPES
========================================
*/

export type VyloFriendRequestStatus =
  | "pending"
  | "accepted"
  | "rejected";


export type VyloFriendRequest = {
  id: string;

  senderId: string;

  receiverId: string;

  senderUsername: string;

  receiverUsername?: string;

  from?: string;

  to?: string;

  senderUid?: string;

  receiverUid?: string;

  status:
    VyloFriendRequestStatus;

  createdAt: number;

  updatedAt?: number;
};


export type VyloFriendStatus =
  | "none"
  | "pending"
  | "friend";


export type VyloFriend = {
  id: string;

  userId: string;

  friendId: string;

  createdAt: number;

  status: "active";
};


/*
========================================
UTILITAIRE
========================================
*/

function getNow(): number {
  return Date.now();
}


/*
========================================
RÉCUPÉRER L'ID EXPÉDITEUR
========================================
*/

function getSenderId(
  request: Partial<VyloFriendRequest>
): string {

  return (
    request.senderId ||
    request.from ||
    request.senderUid ||
    ""
  );

}


/*
========================================
RÉCUPÉRER L'ID DESTINATAIRE
========================================
*/

function getReceiverId(
  request: Partial<VyloFriendRequest>
): string {

  return (
    request.receiverId ||
    request.to ||
    request.receiverUid ||
    ""
  );

}


/*
========================================
ENVOYER UNE DEMANDE D'AMI
========================================
*/

export async function sendVyloFriendRequest(
  senderId: string,
  receiverId: string,
  senderUsername: string = "Joueur",
  receiverUsername: string = ""
): Promise<string> {

  if (!senderId) {

    throw new Error(
      "Utilisateur expéditeur introuvable."
    );

  }


  if (!receiverId) {

    throw new Error(
      "Utilisateur destinataire introuvable."
    );

  }


  if (
    senderId === receiverId
  ) {

    throw new Error(
      "Vous ne pouvez pas vous ajouter vous-même."
    );

  }


  /*
  Note: La validation du statut d'amitié est faite côté serveur
  par les règles Firebase. Le client ne peut pas vérifier
  ces données pour des raisons de sécurité.
  */


  /*
  ======================================
  CRÉER LA DEMANDE
  ======================================
  */

  const requestRef =
    push(
      ref(
        database,
        `vylo/friendRequests/${receiverId}`
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
    getNow();


  const request:
    VyloFriendRequest = {

    id:
      requestId,

    senderId:
      senderId,

    receiverId:
      receiverId,

    senderUsername:
      senderUsername ||
      "Joueur",

    receiverUsername:
      receiverUsername ||
      "",

    status:
      "pending",

    createdAt:
      now,

    updatedAt:
      now,

  };


  /*
  ======================================
  NOTIFICATION
  ======================================
  */

  const notificationRef =
    push(
      ref(
        database,
        `notifications/${receiverId}`
      )
    );


  const notificationId =
    notificationRef.key;


  const updates:
    Record<string, unknown> = {};


  updates[
    `vylo/friendRequests/${receiverId}/${requestId}`
  ] =
    request;


  if (
    notificationId
  ) {

    updates[
      `notifications/${receiverId}/${notificationId}`
    ] = {

      id:
        notificationId,

      type:
        "friend_request",

      title:
        "🤝 Nouvelle demande d'ami",

      message:
        `${senderUsername || "Joueur"} veut devenir votre ami.`,

      fromUid:
        senderId,

      senderId:
        senderId,

      requestId:
        requestId,

      read:
        false,

      createdAt:
        now,

    };

  }


  await update(
    ref(
      database
    ),
    updates
  );


  return requestId;

}


/*
========================================
VÉRIFIER LE STATUT D'AMITIÉ
========================================
*/

export async function checkVyloFriendStatus(
  userId: string,
  otherUserId: string
): Promise<VyloFriendStatus> {

  if (
    !userId ||
    !otherUserId
  ) {

    return "none";

  }


  if (
    userId === otherUserId
  ) {

    return "none";

  }


  /*
  ======================================
  VALIDATION CÔTÉ SERVEUR
  ======================================
  */

  /*
  Note: La vérification de l'amitié et des demandes en attente
  est faite côté serveur par les règles Firebase. Le client ne peut
  pas lire ces données pour des raisons de sécurité.
  */


  return "none";

}


/*
========================================
ÉCOUTER LES DEMANDES REÇUES
========================================
*/

export function listenToVyloFriendRequests(
  userId: string,
  callback: (
    requests:
      VyloFriendRequest[]
  ) => void
): () => void {

  if (!userId) {

    callback([]);

    return () => {};

  }


  const requestsRef =
    ref(
      database,
      `vylo/friendRequests/${userId}`
    );


  const unsubscribe =
    onValue(
      requestsRef,
      (snapshot) => {

        const data =
          snapshot.val();


        if (!data) {

          callback([]);

          return;

        }


        const requests:
          VyloFriendRequest[] = [];


        Object.entries(
          data
        ).forEach(
          ([
            id,
            value,
          ]) => {

            const request =
              value as Partial<VyloFriendRequest>;


            if (
              request.status !==
              "pending"
            ) {

              return;

            }


            const senderId =
              getSenderId(
                request
              );


            const receiverId =
              getReceiverId(
                request
              );


            if (
              receiverId !==
              userId
            ) {

              return;

            }


            requests.push({

              id,

              senderId,

              receiverId,

              senderUsername:
                request.senderUsername ||
                "Joueur",

              receiverUsername:
                request.receiverUsername ||
                "",

              from:
                request.from,

              to:
                request.to,

              senderUid:
                request.senderUid,

              receiverUid:
                request.receiverUid,

              status:
                "pending",

              createdAt:
                request.createdAt ||
                0,

              updatedAt:
                request.updatedAt,

            });

          }
        );


        /*
        Plus récentes en premier
        */

        requests.sort(
          (
            a,
            b
          ) =>
            (
              b.createdAt ||
              0
            )
            -
            (
              a.createdAt ||
              0
            )
        );


        callback(
          requests
        );

      },
      (firebaseError) => {

        console.error(
          "Erreur demandes VYLO :",
          firebaseError
        );


        callback([]);

      }
    );


  return unsubscribe;

}


/*
========================================
ACCEPTER UNE DEMANDE
========================================
*/

export async function acceptVyloFriendRequest(
  request: VyloFriendRequest,
  currentUserId?: string
): Promise<void> {

  if (!request.id) {

    throw new Error(
      "Demande d'ami invalide."
    );

  }


  const senderId =
    getSenderId(
      request
    );


  const receiverId =
    getReceiverId(
      request
    );


  if (!senderId) {

    throw new Error(
      "Expéditeur introuvable."
    );

  }


  if (!receiverId) {

    throw new Error(
      "Destinataire introuvable."
    );

  }


  /*
  Sécurité côté client.
  Les règles Firebase font
  également le contrôle côté serveur.
  */

  if (
    currentUserId &&
    currentUserId !== receiverId
  ) {

    throw new Error(
      "Vous ne pouvez pas accepter cette demande."
    );

  }


  const now =
    getNow();


  const friendshipA:
    VyloFriend = {

    id:
      `${senderId}_${receiverId}`,

    userId:
      senderId,

    friendId:
      receiverId,

    createdAt:
      request.createdAt ||
      now,

    status:
      "active",

  };


  const friendshipB:
    VyloFriend = {

    id:
      `${receiverId}_${senderId}`,

    userId:
      receiverId,

    friendId:
      senderId,

    createdAt:
      request.createdAt ||
      now,

    status:
      "active",

  };


  /*
  ======================================
  MISE À JOUR
  ======================================
  */

  const updates:
    Record<string, unknown> = {


    /*
    Amitié côté expéditeur
    */

    [`vylo/friendships/${senderId}/${receiverId}`]:
      friendshipA,


    /*
    Amitié côté destinataire
    */

    [`vylo/friendships/${receiverId}/${senderId}`]:
      friendshipB,


    /*
    Supprimer la demande
    */

    [`vylo/friendRequests/${receiverId}/${request.id}`]:
      null,


    /*
    Notification expéditeur
    */

    [`notifications/${senderId}/friend_accept_${request.id}`]:
      {

        id:
          `friend_accept_${request.id}`,

        type:
          "friend_accepted",

        title:
          "👥 Demande acceptée",

        message:
          `${request.receiverUsername || "Joueur"} a accepté votre demande d'ami.`,

        fromUid:
          receiverId,

        read:
          false,

        createdAt:
          now,

      },

  };


  await update(
    ref(
      database
    ),
    updates
  );

}


/*
========================================
REFUSER UNE DEMANDE
========================================
*/

export async function rejectVyloFriendRequest(
  request: VyloFriendRequest,
  currentUserId?: string
): Promise<void> {

  if (!request.id) {

    throw new Error(
      "Demande d'ami invalide."
    );

  }


  const receiverId =
    getReceiverId(
      request
    );


  if (
    currentUserId &&
    currentUserId !== receiverId
  ) {

    throw new Error(
      "Vous ne pouvez pas refuser cette demande."
    );

  }


  await remove(
    ref(
      database,
      `vylo/friendRequests/${receiverId}/${request.id}`
    )
  );

}


/*
========================================
ANNULER UNE DEMANDE
========================================
*/

export async function cancelVyloFriendRequest(
  requestId: string,
  senderId: string,
  receiverId: string
): Promise<void> {

  if (
    !requestId ||
    !senderId ||
    !receiverId
  ) {

    throw new Error(
      "Informations de demande invalides."
    );

  }


  const requestSnapshot =
    await get(
      ref(
        database,
        `vylo/friendRequests/${receiverId}/${requestId}`
      )
    );


  if (
    !requestSnapshot.exists()
  ) {

    throw new Error(
      "Demande introuvable."
    );

  }


  const request =
    requestSnapshot.val() as Partial<VyloFriendRequest>;


  if (
    getSenderId(request) !==
    senderId
  ) {

    throw new Error(
      "Vous ne pouvez pas annuler cette demande."
    );

  }


  await remove(
    ref(
      database,
      `vylo/friendRequests/${receiverId}/${requestId}`
    )
  );

}


/*
========================================
SUPPRIMER UN AMI
========================================
*/

export async function removeVyloFriend(
  userId: string,
  friendId: string
): Promise<void> {

  if (
    !userId ||
    !friendId
  ) {

    throw new Error(
      "Utilisateur invalide."
    );

  }


  await update(
    ref(
      database
    ),
    {

      [`vylo/friendships/${userId}/${friendId}`]:
        null,

      [`vylo/friendships/${friendId}/${userId}`]:
        null,

    }
  );

}


/*
========================================
ALIAS COMPATIBILITÉ
========================================
*/

export const sendFriendRequest =
  sendVyloFriendRequest;


export const checkFriendStatus =
  checkVyloFriendStatus;