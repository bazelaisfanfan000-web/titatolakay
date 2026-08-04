import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";

export function useFriendRequestsCount(userId: string | null) {
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setRequestCount(0);
      return;
    }

    // Écouter les demandes d'ami reçues
    const requestsRef = ref(database, `vylo/friendRequests/${userId}`);
    
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        setRequestCount(0);
        return;
      }

      // Compter les demandes en attente (pending)
      let count = 0;
      Object.values(data).forEach((request: any) => {
        if (request.status === "pending") {
          count++;
        }
      });
      
      setRequestCount(count);
    });

    return () => unsubscribe();
  }, [userId]);

  return requestCount;
}
