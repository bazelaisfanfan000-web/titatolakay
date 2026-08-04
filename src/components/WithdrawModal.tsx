"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  currentBalance: number;
  onWithdrawSuccess?: () => void;
}

interface WithdrawResponse {
  success: boolean;
  message?: string;
  error?: string;
  withdrawalId?: string;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  userId,
  currentBalance,
  onWithdrawSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [moncashNumber, setMoncashNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [gameStatus, setGameStatus] = useState<{ 
    firstGamePlayed: boolean; 
    canWithdraw: boolean; 
    minimumBet: number | null;
    currentBalance: number;
  } | null>(null);

  const MIN_WITHDRAWAL = 100; // HTG - Minimum requis par MonCash
  const MAX_WITHDRAWAL = 10000; // HTG - Maximum autorisé

  // Récupérer le statut de la première partie
  useEffect(() => {
    async function fetchGameStatus() {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/user/games-status?userId=${userId}`);
        const data = await response.json();
        
        if (data.success) {
          setGameStatus({
            firstGamePlayed: data.firstGamePlayed,
            canWithdraw: data.canWithdraw,
            minimumBet: data.minimumBet ?? null,
            currentBalance: data.currentBalance ?? 0
          });
        }
      } catch (err) {
        console.error("Erreur récupération statut partie:", err);
      }
    }
    
    fetchGameStatus();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!userId) {
      setError("Utilisateur non connecté");
      return;
    }

    const amountNum = Number(amount);
    
    if (!amountNum || amountNum < MIN_WITHDRAWAL || amountNum > MAX_WITHDRAWAL) {
      setError(`Le montant doit être entre ${MIN_WITHDRAWAL} et ${MAX_WITHDRAWAL} HTG`);
      return;
    }

    if (amountNum > currentBalance) {
      setError("Solde insuffisant");
      return;
    }

    // Valider le numéro MonCash (8 chiffres après +509)
    const phoneRegex = /^\+509\d{8}$/;
    const cleanNumber = moncashNumber.startsWith("+509") 
      ? moncashNumber 
      : `+509${moncashNumber}`;
    
    if (!phoneRegex.test(cleanNumber)) {
      setError("Numéro MonCash invalide (format: +509XXXXXXXX)");
      return;
    }

    setLoading(true);

    try {
      // Récupérer le token Firebase
      const user = auth.currentUser;
      if (!user) {
        setError("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          moncashNumber: cleanNumber,
        }),
      });

      const data: WithdrawResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors du retrait");
      }

      setSuccess(true);
      setAmount("");
      setMoncashNumber("");

      // Rafraîchir le solde après succès
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }

      // Fermer le modal après 2 secondes
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (err) {
      console.error("[WITHDRAW_MODAL] Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount("");
      setMoncashNumber("");
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[24px] border border-blue-500/20 bg-[#080808] shadow-[0_10px_50px_rgba(0,0,0,0.7)]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-lg shadow-[0_3px_0_rgba(20,80,200,0.3)]">
              💸
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white">
                Retirer de l'argent
              </h2>
              <p className="mt-0.5 text-[9px] text-white/30">
                Transférer vers MonCash
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white/50 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-[13px] font-bold text-white mb-1">
                Retrait initié avec succès
              </p>
              <p className="text-[10px] text-white/40">
                Votre demande est en traitement
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Statut de la première partie */}
              {gameStatus && (
                <div className={`rounded-xl border px-4 py-3 ${
                  gameStatus.canWithdraw 
                    ? 'border-green-500/20 bg-green-500/[0.08]' 
                    : 'border-yellow-500/20 bg-yellow-500/[0.08]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold text-white/70">
                      Statut de retrait
                    </p>
                    <p className="text-[10px] font-bold text-white">
                      {gameStatus.canWithdraw ? "LIBRE" : "BLOQUÉ"}
                    </p>
                  </div>
                  
                  {!gameStatus.canWithdraw ? (
                    <p className="text-[8px] text-yellow-400">
                      🔒 Vous devez jouer 1 partie avec une mise de {gameStatus.minimumBet} HTG (50% de votre solde) avant de retirer !
                    </p>
                  ) : (
                    <p className="text-[8px] text-green-400">
                      🔥 VOUS ÊTES MAINTENANT LIBRE ! Plus de minimum imposé !
                    </p>
                  )}
                </div>
              )}

              {/* Solde actuel */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[9px] text-white/30 mb-1">Solde disponible</p>
                <p className="text-[18px] font-black text-white">
                  {currentBalance.toLocaleString()} HTG
                </p>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-2">
                  Montant à retirer
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={MIN_WITHDRAWAL}
                  max={currentBalance}
                  placeholder={`Min. ${MIN_WITHDRAWAL} HTG`}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                  required
                />
                <p className="mt-1.5 text-[9px] text-white/30">
                  Minimum: {MIN_WITHDRAWAL} HTG
                </p>
              </div>

              {/* Numéro MonCash */}
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-2">
                  Numéro MonCash
                </label>
                <input
                  type="tel"
                  value={moncashNumber}
                  onChange={(e) => setMoncashNumber(e.target.value)}
                  placeholder="+509XXXXXXXX"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                  required
                />
                <p className="mt-1.5 text-[9px] text-white/30">
                  Format: +509XXXXXXXX (8 chiffres)
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <p className="text-[10px] text-red-400">{error}</p>
                </div>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-blue-500/30 bg-blue-600 px-4 py-3.5 text-[13px] font-bold text-white shadow-[0_4px_0_rgba(30,80,200,0.3)] transition-all hover:bg-blue-500 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(30,80,200,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Traitement en cours..." : "Confirmer le retrait"}
              </button>

            </form>
          )}
        </div>

        {/* Footer info */}
        {!success && (
          <div className="border-t border-white/[0.06] px-5 py-3">
            <p className="text-[9px] text-center text-white/25">
              💸 Le solde sera réservé immédiatement
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
