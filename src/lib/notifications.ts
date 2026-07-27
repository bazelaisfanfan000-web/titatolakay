import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  firestore,
} from "./firebase";


export type NotificationData = {

  title: string;

  message: string;

  type: string;

  amount?: number;

  from?: string;

  text?: string;

  friendId?: string;

  link?: string;

  roomId?: string;

};


export async function sendNotification(

  userId: string,

  data: NotificationData

) {

  try {

    if (
      !userId ||
      typeof userId !== "string"
    ) {

      throw new Error(
        "User ID invalide"
      );

    }


    await addDoc(

      collection(
        firestore,
        "notifications",
        userId,
        "items"
      ),

      {

        // =====================================
        // INFORMATIONS NOTIFICATION
        // =====================================

        title:
          data.title || "",


        message:
          data.message || "",


        type:
          data.type || "general",


        // =====================================
        // DONNÉES FINANCIÈRES
        // =====================================

        amount:
          data.amount ?? 0,


        // =====================================
        // DONNÉES AMIS / CHAT
        // =====================================

        from:
          data.from || "",


        text:
          data.text || "",


        friendId:
          data.friendId || "",


        // =====================================
        // REDIRECTION
        // =====================================

        link:
          data.link || "",


        // =====================================
        // PARTIE TÍTATO
        // =====================================

        roomId:
          data.roomId || "",


        // =====================================
        // ÉTAT
        // =====================================

        read:
          false,


        // =====================================
        // DATE
        // =====================================

        createdAt:
          serverTimestamp(),

      }

    );


    console.log(
      "Notification envoyée:",
      {
        userId,
        type: data.type,
        roomId: data.roomId,
      }
    );


    return {
      success: true,
    };


  } catch (error) {

    console.error(
      "Erreur création notification:",
      error
    );


    throw error;

  }

}