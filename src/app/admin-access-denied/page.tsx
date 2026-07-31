"use client";

import { useRouter } from "next/navigation";

export default function AdminAccessDeniedPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      {/* Décorations */}
      <div className="pointer-events-none fixed -left-24 top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-24 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />

      {/* Conteneur mobile */}
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6">
            <p className="text-6xl mb-4">🔒</p>
            <h1 className="text-2xl font-black text-white mb-2">
              Accès Refusé
            </h1>
            <p className="text-white/50 text-sm">
              L'accès au tableau de bord admin n'est possible que via le lien secret.
            </p>
          </div>

          <div className="bg-red-500/[0.10] border border-red-400/30 rounded-xl p-4 mb-6">
            <p className="text-red-300 text-xs font-bold mb-2">
              ⚠️ Sécurité
            </p>
            <p className="text-white/70 text-xs">
              Pour accéder au panneau d'administration, vous devez utiliser le lien secret fourni par l'administrateur.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-white transition hover:bg-white/[0.05]"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </main>
  );
}
