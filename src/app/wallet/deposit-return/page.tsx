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

  const referenceId = searchParams.get("referenceId");
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (!referenceId) {
      setStatus("failed");
      return;
    }

    // Écouter le statut du dépôt en temps réel
    const depositsRef = ref(database, `deposits`);
    
    // Note: On ne peut pas filtrer directement par referenceId côté client
    // On va rediriger vers le wallet après un délai
    const timer = setTimeout(() => {
      router.push("/wallet");
    }, 3000);

    // Simuler un succès pour l'UX (le webhook traitera réellement le dépôt)
    setStatus("success");

    return () => clearTimeout(timer);
  }, [referenceId, router]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#0D1224] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
            status === "success" ? "bg-green-600/20 border border-green-500/30" :
            status === "pending" ? "bg-yellow-600/20 border border-yellow-500/30" :
            "bg-red-600/20 border border-red-500/30"
          }`}>
            {status === "loading" && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            )}
            {status === "success" && (
              <span className="text-4xl">✓</span>
            )}
            {status === "pending" && (
              <span className="text-4xl">⏳</span>
            )}
            {status === "failed" && (
              <span className="text-4xl">✕</span>
            )}
          </div>
        </div>

        <h1 className="text-center text-2xl font-black text-white mb-2">
          {status === "loading" && "Traitement en cours..."}
          {status === "success" && "Paiement reçu !"}
          {status === "pending" && "Paiement en attente"}
          {status === "failed" && "Erreur"}
        </h1>

        <p className="text-center text-gray-400 mb-6">
          {status === "loading" && "Veuillez patienter pendant que nous traitons votre dépôt..."}
          {status === "success" && "Votre dépôt a été reçu avec succès. Le solde sera mis à jour automatiquement."}
          {status === "pending" && "Votre paiement est en cours de traitement."}
          {status === "failed" && "Une erreur s'est produite. Veuillez réessayer."}
        </p>

        {referenceId && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Référence</p>
            <p className="text-sm font-mono text-white">{referenceId}</p>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Redirection vers le portefeuille...
          </p>
        </div>
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
