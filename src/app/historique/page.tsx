"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Historique() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const idToken = await user.getIdToken();
      setToken(idToken);

      // Récupérer l'historique
      try {
        const response = await fetch("/api/history", {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });

        const data = await response.json();
        if (data.success) {
          setHistory(data.history);
        }
      } catch (error) {
        console.error("Erreur récupération historique:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "GAME_WIN":
        return "🏆";
      case "GAME_LOSS":
        return "😢";
      case "bet":
        return "🎮";
      case "deposit":
        return "💰";
      case "withdraw":
        return "💸";
      default:
        return "📋";
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "GAME_WIN":
        return "Partie gagnée";
      case "GAME_LOSS":
        return "Partie perdue";
      case "bet":
        return "Mise";
      case "deposit":
        return "Dépôt";
      case "withdraw":
        return "Retrait";
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-white/70";
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      {/* Décorations */}
      <div className="pointer-events-none fixed -left-24 top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-24 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

      {/* Conteneur mobile */}
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden pb-28">
        {/* Header fixe */}
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-[#020617]/95 backdrop-blur-2xl">
          <div className="mx-auto flex h-[64px] w-full max-w-[430px] items-center justify-between px-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/70 transition hover:bg-white/[0.05]"
            >
              ←
            </button>

            <h1 className="text-[17px] font-black tracking-tight text-white">
              Historique
            </h1>

            <div className="w-10" />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 pb-10 pt-[88px]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-white/50">Chargement...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-4">📜</p>
              <p className="text-white/50">Aucun historique</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-xl">
                      {getTransactionIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-white/90">
                          {getTransactionLabel(item.type)}
                        </p>
                        <p className={`text-[11px] font-black ${getTransactionColor(item.type, item.amount)}`}>
                          {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString("fr-FR")} HTG
                        </p>
                      </div>

                      {item.bet && (
                        <p className="mt-1 text-[9px] text-white/40">
                          Mise: {item.bet.toLocaleString("fr-FR")} HTG
                        </p>
                      )}

                      <p className="mt-1 text-[9px] text-white/30">
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation bas */}
        <nav className="fixed bottom-3 left-1/2 z-50 flex h-[64px] w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 items-center justify-around rounded-2xl border border-blue-400/20 bg-[#050914]/95 px-2 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_3px_0_rgba(30,64,175,0.35)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[8px] text-white/35 transition active:translate-y-[2px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-[18px]">
              🏠
            </span>
            Accueil
          </button>

          <button
            type="button"
            onClick={() => router.push("/wallet")}
            className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[8px] text-white/35 transition active:translate-y-[2px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-[18px]">
              💼
            </span>
            Portefeuille
          </button>

          <button
            type="button"
            onClick={() => router.push("/historique")}
            className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[8px] font-bold text-blue-400 transition active:translate-y-[2px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/[0.10] shadow-[0_2px_0_rgba(30,64,175,0.5)] text-[18px]">
              📜
            </span>
            Historique
          </button>

          <button
            type="button"
            onClick={() => router.push("/vylo")}
            className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[8px] text-white/35 transition active:translate-y-[2px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-[18px]">
              👥
            </span>
            VYLO
          </button>
        </nav>
      </div>
    </main>
  );
}
