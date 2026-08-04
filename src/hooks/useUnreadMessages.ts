import { useEffect, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { database } from "@/lib/firebase";

export function useUnreadMessages(userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    // Écouter tous les chats de l'utilisateur
    const chatsRef = ref(database, `vylo/chats`);
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;

      Object.entries(data).forEach(([chatId, chatData]: [string, any]) => {
        // Vérifier si l'utilisateur participe à ce chat
        if (!chatId.includes(userId)) return;

        const messages = chatData.messages;
        if (!messages) return;

        // Compter les messages non lus pour cet utilisateur
        Object.values(messages).forEach((message: any) => {
          // Si le message est pour l'utilisateur et n'est pas lu
          if (
            message.receiverId === userId &&
            message.readStatus !== "2V"
          ) {
            totalUnread++;
          }
        });
      });

      setUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [userId]);

  return unreadCount;
}

export function markMessagesAsRead(chatId: string, userId: string) {
  const messagesRef = ref(database, `vylo/chats/${chatId}/messages`);
  
  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) return;

    const updates: Record<string, any> = {};

    Object.entries(data).forEach(([messageId, message]: [string, any]) => {
      // Marquer comme lu si le message est pour l'utilisateur
      if (message.receiverId === userId && message.readStatus !== "2V") {
        updates[`vylo/chats/${chatId}/messages/${messageId}/readStatus`] = "2V";
      }
    });

    if (Object.keys(updates).length > 0) {
      update(ref(database), updates);
    }
  }, { onlyOnce: true });
}
