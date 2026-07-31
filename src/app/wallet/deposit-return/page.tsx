"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

function DepositReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [amount, setAmount] = useState<number>(0);
  const [showAnimation, setShowAnimation] = useState(false);

  const referenceId = searchParams.get("referenceId");
  const orderId = searchParams.get("orderId");
  const amountParam = searchParams.get("amount");

  useEffect(() => {
    if (amountParam) {
      setAmount(parseFloat(amountParam));
    }

    if (!referenceId) {
      setStatus("failed");
      return;
    }

    // Simuler un succès pour l'UX (le webhook traitera réellement le dépôt)
    setTimeout(() => {
      setStatus("success");
      setShowAnimation(true);
    }, 1000);

    // Redirection automatique vers le dashboard après 5 secondes
    const redirectTimer = setTimeout(() => {
      router.push("/dashboard");
    }, 5000);

    return () => clearTimeout(redirectTimer);
  }, [referenceId, amountParam, router]);

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#0D1224] border border-white/10 rounded-3xl p-8 shadow-2xl">
        {/* Animation V vert */}
        <div className="flex justify-center mb-8">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            status === "success" ? "bg-green-600/20 border-4 border-green-500 scale-110" :
            status === "pending" ? "bg-yellow-600/20 border-4 border-yellow-500/30" :
            status === "failed" ? "bg-red-600/20 border-4 border-red-500/30" :
            "bg-gray-600/20 border-4 border-gray-500/30"
          }`}>
            {status === "loading" && (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            )}
            {status === "success" && (
              <div className={`text-6xl font-black text-green-500 transition-all duration-500 ${showAnimation ? 'scale-125' : 'scale-0'}`}>
                ✓
              </div>
            )}
            {status === "pending" && (
              <span className="text-4xl">⏳</span>
            )}
            {status === "failed" && (
              <span className="text-4xl text-red-500">✕</span>
            )}
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-center text-3xl font-black text-white mb-2">
          {status === "loading" && "Traitement en cours..."}
          {status === "success" && "Dépôt Réussi !"}
          {status === "pending" && "Paiement en attente"}
          {status === "failed" && "Erreur"}
        </h1>

        {/* Message */}
        <p className="text-center text-gray-400 mb-8">
          {status === "loading" && "Veuillez patienter pendant que nous traitons votre dépôt..."}
          {status === "success" && "Votre dépôt a été reçu avec succès. Le solde sera mis à jour automatiquement."}
          {status === "pending" && "Votre paiement est en cours de traitement."}
          {status === "failed" && "Une erreur s'est produite. Veuillez réessayer."}
        </p>

        {/* Détails du dépôt */}
        {status === "success" && (
          <div className="space-y-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Montant déposé</p>
              <p className="text-3xl font-black text-white">{amount.toLocaleString()} HTG</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Frais</p>
              <p className="text-2xl font-bold text-green-500">0 HTG</p>
            </div>

            {referenceId && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Référence</p>
                <p className="text-sm font-mono text-white break-all">{referenceId}</p>
              </div>
            )}
          </div>
        )}

        {/* Bouton Dashboard */}
        {status === "success" && (
          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-600/30"
          >
            Aller au Dashboard
          </button>
        )}

        {/* Message de redirection automatique */}
        {status === "success" && (
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              Redirection automatique dans 5 secondes...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepositReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <DepositReturnContent />
    </Suspense>
  );
}
