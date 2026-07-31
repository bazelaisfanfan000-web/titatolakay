"use client";

import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";

type RevengeRequest = {
  requestId: string;
  requesterId: string;
  opponentId: string;
  previousGameId: string;
  previousRoomId: string;
  betAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  createdAt: number;
  requesterName?: string;
  requesterAvatar?: string;
};

type Props = {
  userId: string;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export default function RevengeRequestModal({ userId, onAccept, onReject }: Props) {
  const [request, setRequest] = useState<RevengeRequest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Écouter les demandes de revanche pour cet utilisateur
    const requestsRef = ref(database, 'revengeRequests');
    
    const handleRequests = (snapshot: any) => {
      if (!snapshot.exists()) {
        setRequest(null);
        return;
      }

      const requests = snapshot.val();
      let pendingRequest: RevengeRequest | null = null;

      for (const requestId of Object.keys(requests)) {
        const req = requests[requestId];
        if (req.opponentId === userId && req.status === 'pending') {
          pendingRequest = { ...req, requestId };
          break;
        }
      }

      setRequest(pendingRequest);
    };

    onValue(requestsRef, handleRequests);

    return () => {
      off(requestsRef);
    };
  }, [userId]);

  if (!request) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(request.requestId);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(request.requestId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center overflow-y-auto bg-black/90 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="relative w-full max-h-[94vh] overflow-y-auto rounded-t-[2rem] border border-orange-400/20 bg-gradient-to-br from-orange-950 via-[#05070d] to-black px-4 pb-5 pt-6 text-center shadow-[0_-10px_50px_rgba(0,0,0,0.7)] sm:max-w-md sm:rounded-3xl sm:p-6 sm:shadow-2xl">
        {/* Petit indicateur mobile */}
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20 sm:hidden" />

        {/* Icône */}
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-5xl shadow-inner sm:mb-4 sm:h-24 sm:w-24 sm:text-6xl">
          ⚔️
        </div>

        {/* Titre */}
        <h2 className="mb-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Demande de revanche
        </h2>

        {/* Message */}
        <p className="mb-4 px-2 text-sm text-white/60 sm:mb-5">
          Votre adversaire vous demande une revanche
        </p>

        {/* Informations */}
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 sm:mb-5 sm:p-4">
          <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-white/[0.06] px-1">
            <span className="text-xs font-medium text-white/60 sm:text-sm">
              🎮 Mise de la revanche
            </span>
            <b className="text-sm font-black text-white sm:text-base">
              {request.betAmount} HTG
            </b>
          </div>
        </div>

        {/* Boutons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="
              group
              relative
              flex
              min-h-[50px]
              w-full
              items-center
              justify-center
              gap-2
              overflow-hidden
              rounded-2xl
              border
              border-green-300/40
              bg-gradient-to-br
              from-green-400/30
              via-green-500/20
              to-green-700/30
              px-4
              py-3
              text-sm
              font-black
              text-white
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-3px_6px_rgba(0,120,30,0.35),0_5px_0_rgba(10,150,55,0.85),0_8px_20px_rgba(0,255,80,0.18)]
              backdrop-blur-xl
              transition-all
              duration-150
              hover:border-green-200/60
              hover:bg-green-400/30
              hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-3px_8px_rgba(0,120,30,0.4),0_5px_0_rgba(10,150,55,0.9),0_10px_25px_rgba(0,255,100,0.3)]
              active:translate-y-[4px]
              active:shadow-[inset_0_2px_5px_rgba(0,80,20,0.4),0_1px_0_rgba(10,150,55,0.8)]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? (
              <>
                ⏳
                <span>Traitement...</span>
              </>
            ) : (
              <>
                ✅
                <span>Accepter la revanche</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            className="
              group
              relative
              flex
              min-h-[50px]
              w-full
              items-center
              justify-center
              gap-2
              overflow-hidden
              rounded-2xl
              border
              border-red-300/40
              bg-gradient-to-br
              from-red-400/30
              via-red-500/20
              to-red-700/30
              px-4
              py-3
              text-sm
              font-black
              text-white
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-3px_6px_rgba(120,0,30,0.35),0_5px_0_rgba(150,10,55,0.85),0_8px_20px_rgba(255,0,80,0.18)]
              backdrop-blur-xl
              transition-all
              duration-150
              hover:border-red-200/60
              hover:bg-red-400/30
              hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-3px_8px_rgba(120,0,30,0.4),0_5px_0_rgba(150,10,55,0.9),0_10px_25px_rgba(255,0,100,0.3)]
              active:translate-y-[4px]
              active:shadow-[inset_0_2px_5px_rgba(80,0,20,0.4),0_1px_0_rgba(150,10,55,0.8)]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? (
              <>
                ⏳
                <span>Traitement...</span>
              </>
            ) : (
              <>
                ❌
                <span>Refuser</span>
              </>
            )}
          </button>
        </div>

        {/* Espace safe area */}
        <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
      </div>
    </div>
  );
}
