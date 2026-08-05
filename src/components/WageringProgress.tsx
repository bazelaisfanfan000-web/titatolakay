"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock, AlertCircle } from "lucide-react";

interface WageringData {
  canWithdraw: boolean;
  wageringCompleted: number;
  wageringRequired: number;
  progress: number;
  remaining: number;
  withdrawalUnlocked: boolean;
}

interface WageringProgressProps {
  userId: string;
}

export default function WageringProgress({ userId }: WageringProgressProps) {
  const [wageringData, setWageringData] = useState<WageringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWageringStatus() {
      try {
        const response = await fetch(`/api/wagering/check?userId=${userId}`);
        const data = await response.json();
        
        if (data.success) {
          setWageringData(data);
        } else {
          setError(data.message || "Erreur lors de la récupération du statut");
        }
      } catch (err) {
        console.error("Erreur fetch wagering:", err);
        setError("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    }

    fetchWageringStatus();
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-[8px] text-white/50">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/10 bg-red-500/[0.06] p-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={12} className="text-red-400" />
          <p className="text-[8px] text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!wageringData) {
    return null;
  }

  // Si pas de dépôts, afficher un message indiquant que le retrait est disponible
  if (wageringData.wageringRequired === 0) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/[0.08] p-3">
        <div className="flex items-center gap-2">
          <Unlock size={14} className="text-green-400" />
          <div>
            <p className="text-[9px] font-bold text-green-300">
              Deposer et retirer quand tu veux
            </p>
            <p className="text-[8px] text-white/60">
              Ici votre argent est en paix💵😴 
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { canWithdraw, wageringCompleted, wageringRequired, progress, remaining } = wageringData;

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {canWithdraw ? (
            <Unlock size={14} className="text-green-400" />
          ) : (
            <Lock size={14} className="text-yellow-400" />
          )}
          <p className="text-[9px] font-bold text-white">
            {canWithdraw ? "Retrait disponible" : "Retrait sécurisé"}
          </p>
        </div>
        <p className="text-[8px] text-white/50">
          {wageringCompleted} / {wageringRequired} HTG
        </p>
      </div>

      {/* Barre de progression */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.1]">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-300 ${
            canWithdraw ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[8px] text-white/50">
          Progression: <span className="font-bold text-white">{Math.min(progress, 100).toFixed(0)}%</span>
        </p>
        {!canWithdraw && (
          <p className="text-[8px] text-yellow-400">
            Encore {remaining} HTG à miser
          </p>
        )}
      </div>

      {!canWithdraw && (
        <div className="mt-2 rounded-lg border border-yellow-500/10 bg-yellow-500/[0.06] p-2">
          <p className="text-[7px] text-yellow-400/80 text-center">
            🔒 Vous devez jouer le montant total de vos dépôts × 2 avant de pouvoir retirer
          </p>
        </div>
      )}
    </div>
  );
}
