import { useState, useEffect } from "react";
import { onValue, ref, set, remove } from "firebase/database";
import { database } from "@/lib/firebase";

export function useBlockUser(currentUserId: string | null) {
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) {
      setBlockedUsers(new Set());
      return;
    }

    const blockedRef = ref(database, `vylo/blocked/${currentUserId}`);
    
    const unsubscribe = onValue(blockedRef, (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        setBlockedUsers(new Set());
        return;
      }

      const blockedSet = new Set<string>();
      Object.keys(data).forEach((blockedUserId) => {
        blockedSet.add(blockedUserId);
      });
      
      setBlockedUsers(blockedSet);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const blockUser = async (userIdToBlock: string) => {
    if (!currentUserId) return;
    
    await set(
      ref(database, `vylo/blocked/${currentUserId}/${userIdToBlock}`),
      {
        blockedAt: Date.now(),
      }
    );
  };

  const unblockUser = async (userIdToUnblock: string) => {
    if (!currentUserId) return;
    
    await remove(
      ref(database, `vylo/blocked/${currentUserId}/${userIdToUnblock}`)
    );
  };

  const isBlocked = (userId: string) => {
    return blockedUsers.has(userId);
  };

  return {
    blockedUsers,
    blockUser,
    unblockUser,
    isBlocked,
  };
}

export function checkIfBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const blockedRef = ref(database, `vylo/blocked/${blockerId}/${blockedId}`);
    
    onValue(blockedRef, (snapshot) => {
      resolve(snapshot.exists());
    }, { onlyOnce: true });
  });
}
