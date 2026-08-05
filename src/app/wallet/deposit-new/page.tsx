"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calculs en temps réel
  const [amountGross, setAmountGross] = useState(0);
  const [fee, setFee] = useState(0);
  const [amountNet, setAmountNet] = useState(0);

  // Mise à jour des calculs à chaque changement de montant
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const depositFeeRate = 0.03; // 3%
    const calculatedFee = Math.round((numAmount * depositFeeRate) * 100) / 100;
    const calculatedNet = Math.round((numAmount - calculatedFee) * 100) / 100;

    setAmountGross(numAmount);
    setFee(calculatedFee);
    setAmountNet(calculatedNet);
  }, [amount]);

  const quickAmounts = [25, 100, 250, 500, 1000];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountGross,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du dépôt");
      }

      // Redirection vers MonCashConnect
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden">
        <div className="px-4 pb-10 pt-12">
          {/* Bouton retour */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/50 hover:text-white"
          >
            ← Retour
          </button>

          {/* Titre */}
          <h1 className="mb-2 text-center text-[21px] font-black tracking-tight">
            Déposer de l'argent
          </h1>
          <p className="mb-6 text-center text-[11px] text-white/40">
            Ajouter des HTG à votre wallet
          </p>

          {/* Info temps */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-[10px]">⏱️</span>
            <p className="text-[10px] text-white/40">
              La vérification des dépôts prend 2 minutes maximum
            </p>
          </div>

          {/* Carte principale */}
          <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4">
            {/* Montant */}
            <div className="mb-5">
              <label className="mb-2 block text-[10px] font-bold text-white/50">
                Montant à déposer (HTG)
              </label>

              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="25"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 pr-14 text-sm font-bold text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/40"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30">
                  HTG
                </span>
              </div>

              {/* Affichage du montant reçu */}
              {amountGross > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-green-400">
                  <span>💳</span>
                  <span className="font-bold">
                    Vous recevrez {amountNet.toFixed(0)} HTG sur votre compte
                  </span>
                </div>
              )}
            </div>

            {/* Boutons rapides */}
            <div className="mb-5 grid grid-cols-5 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.05] py-2 text-[10px] font-bold text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  {quickAmount}
                </button>
              ))}
            </div>

            {/* Résumé en temps réel */}
            {amountGross > 0 && (
              <div className="mb-5 rounded-xl border border-green-500/15 bg-green-600/[0.06] px-3 py-3">
                <p className="mb-2 text-[9px] font-bold text-white/50">
                  💰 Vous recevrez
                </p>

                <div className="flex items-center justify-center">
                  <span className="text-[18px] font-black text-green-400">
                    {amountNet.toFixed(2)} HTG
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-white/40">Montant envoyé :</span>
                    <span className="font-bold text-white/60">{amountGross.toFixed(2)} HTG</span>
                  </div>

                  <div className="flex justify-between text-[9px]">
                    <span className="text-white/40">Frais 3% :</span>
                    <span className="font-bold text-red-400">-{fee.toFixed(2)} HTG</span>
                  </div>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] leading-4 text-red-300">
                {error}
              </div>
            )}

            {/* Bouton déposer */}
            <button
              type="button"
              onClick={handleDeposit}
              disabled={loading || amountGross < 25}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-blue-400/40 bg-blue-500/20 text-center text-xs font-black text-blue-100 shadow-[0_4px_0_rgba(30,64,175,0.8),0_0_18px_rgba(37,99,235,0.12)] backdrop-blur-md transition-all hover:border-blue-300/60 hover:bg-blue-500/30 hover:shadow-[0_5px_0_rgba(30,64,175,0.8),0_0_25px_rgba(37,99,235,0.2)] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              💳 Continuer avec MonCash
            </button>
          </section>

          {/* Info */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[9px] text-white/20">💳</span>
            <p className="text-center text-[9px] text-white/25">
              Le paiement sera sécurisé par MonCash.
              <br />
              Votre solde sera crédité après confirmation du paiement.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
