import { useState } from "react";
import { auth } from "@/lib/firebase";

export function useRevenge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRevenge = async (
    opponentId: string,
    previousGameId: string,
    previousRoomId: string,
    betAmount: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Non connecté");
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/revenge/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requesterId: user.uid,
          opponentId,
          previousGameId,
          previousRoomId,
          betAmount
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la demande de revanche");
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const acceptRevenge = async (requestId: string) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Non connecté");
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/revenge/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId,
          userId: user.uid
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'acceptation");
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectRevenge = async (requestId: string) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Non connecté");
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/revenge/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId,
          userId: user.uid
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors du refus");
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    requestRevenge,
    acceptRevenge,
    rejectRevenge,
    loading,
    error
  };
}
