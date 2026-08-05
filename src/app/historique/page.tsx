"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useFriendRequestsCount } from "@/hooks/useFriendRequestsCount";

export default function Historique() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<string>("tous"); // "tous", "depots", "retraits", "parties", "commissions", "echecs", "encours"
  const unreadCount = useUnreadMessages(currentUser?.uid || null);
  const friendRequestCount = useFriendRequestsCount(currentUser?.uid || null);
  const totalNotifications = unreadCount + friendRequestCount;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // Écouter le solde en temps réel
      const balanceRef = ref(database, `users/${user.uid}/balance`);
      const unsubscribeBalance = onValue(balanceRef, (snapshot) => {
        const val = snapshot.val();
        setBalance(Number(val) || 0);
      });

      const idToken = await user.getIdToken();
      setToken(idToken);

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

      return () => {
        unsubscribeBalance();
      };
    });

    return () => unsubscribe();
  }, [router]);

  // Filtrage à chaque changement de filtre ou d'historique
  useEffect(() => {
    if (!history.length) {
      setFilteredHistory([]);
      return;
    }

    let filtered = [...history];

    switch (filter) {
      case "depots":
        filtered = filtered.filter(item => item.type === "deposit");
        break;
      case "retraits":
        filtered = filtered.filter(item => item.type === "withdraw");
        break;
      case "parties":
        filtered = filtered.filter(item => 
          item.type === "game_win" || 
          item.type === "game_loss" || 
          item.type === "game_bet"
        );
        break;
      case "commissions":
        filtered = filtered.filter(item => item.type === "referral_commission");
        break;
      case "echecs":
        filtered = filtered.filter(item => item.status === "failed");
        break;
      case "encours":
        filtered = filtered.filter(item => 
          item.status === "pending" || 
          item.status === "processing" || 
          item.status === "queued"
        );
        break;
      default: // "tous"
        break;
    }

    setFilteredHistory(filtered);
  }, [history, filter]);

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

  const getTransactionIcon = (type: string, status?: string) => {
    if (type === "game_win") return "🏆";
    if (type === "game_loss") return "😢";
    if (type === "deposit") {
      if (status === "completed") return "📥";
      if (status === "failed") return "❌";
      return "⏳";
    }
    if (type === "withdraw") {
      if (status === "completed") return "📤";
      if (status === "failed") return "❌";
      return "⏳";
    }
    if (type === "game_bet") return "🎮";
    if (type === "referral_commission") return "🎁";
    return "📋";
  };

  const getTransactionLabel = (type: string, status?: string) => {
    if (type === "game_win") return "Partie gagnée";
    if (type === "game_loss") return "Partie perdue";
    if (type === "deposit") {
      if (status === "completed") return "Dépôt réussi";
      if (status === "failed") return "Dépôt échoué";
      return "Dépôt en cours";
    }
    if (type === "withdraw") {
      if (status === "completed") return "Retrait réussi";
      if (status === "failed") return "Retrait échoué";
      return "Retrait en cours";
    }
    if (type === "game_bet") return "Mise";
    if (type === "referral_commission") return "Commission parrainage";
    return type;
  };

  const getTransactionColor = (type: string, amount: number, status?: string) => {
    if (status === "failed") return "text-red-400";
    if (status === "pending" || status === "processing" || status === "queued") return "text-yellow-400";
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-white/70";
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { label: string; color: string }> = {
      completed: { label: "Réussi", color: "bg-green-500/20 text-green-400" },
      failed: { label: "Échoué", color: "bg-red-500/20 text-red-400" },
      pending: { label: "En cours", color: "bg-yellow-500/20 text-yellow-400" },
      processing: { label: "En cours", color: "bg-yellow-500/20 text-yellow-400" },
      queued: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" }
    };
    const config = statusConfig[status];
    if (!config) return null;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formattedBalance = balance.toLocaleString("fr-FR");

  // Offre de lancement
  const now = Date.now();
  const promoEnd = new Date('2026-09-03T23:59:59').getTime();
  const isPromo = now < promoEnd;

  // Fonction pour compter les transactions par catégorie (pour les badges)
  const countByCategory = (category: string) => {
    if (!history.length) return 0;
    switch (category) {
      case "depots":
        return history.filter(item => item.type === "deposit").length;
      case "retraits":
        return history.filter(item => item.type === "withdraw").length;
      case "parties":
        return history.filter(item => 
          item.type === "game_win" || item.type === "game_loss" || item.type === "game_bet"
        ).length;
      case "commissions":
        return history.filter(item => item.type === "referral_commission").length;
      case "echecs":
        return history.filter(item => item.status === "failed").length;
      case "encours":
        return history.filter(item => 
          item.status === "pending" || item.status === "processing" || item.status === "queued"
        ).length;
      default:
        return history.length;
    }
  };

  return (
    <main className="min-h-screen bg-[#030303] text-white">

      <div className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 py-4">

        {/* ==========================================
            HEADER
        ========================================== */}

        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">

          <div className="flex h-[58px] items-center justify-between px-4">

            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/70 transition hover:bg-white/[0.05]"
            >
              ←
            </button>

            <div className="text-center">
              <h1 className="text-[18px] font-black tracking-tight">
                Historique
              </h1>
              <p className="mt-0.5 text-[9px] text-white/30">
                {formattedBalance} HTG
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 text-sm shadow-[0_3px_0_rgba(30,100,255,0.35)]">
              📜
            </div>

          </div>

        </header>


        {/* ==========================================
            FILTRES
        ========================================== */}

        <div className="px-4 pt-3 pb-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: "tous", label: "Tous" },
              { key: "depots", label: "Dépôts" },
              { key: "retraits", label: "Retraits" },
              { key: "parties", label: "Parties" },
              { key: "commissions", label: "Commissions" },
              { key: "echecs", label: "Échecs" },
              { key: "encours", label: "En cours" },
            ].map((f) => {
              const isActive = filter === f.key;
              const count = f.key === "tous" ? history.length : countByCategory(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`
                    shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold transition-all
                    ${isActive
                      ? "bg-blue-600/30 border border-blue-400/40 text-blue-300 shadow-[0_0_12px_rgba(30,100,255,0.2)]"
                      : "bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.08]"
                    }
                  `}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`ml-1.5 ${isActive ? "text-blue-300" : "text-white/30"}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>


        {/* ==========================================
            CONTENU
        ========================================== */}

        <div className="px-4 pb-[90px] pt-5">

          {/* Badge offre de lancement */}
          {isPromo && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm">
              <span className="text-[9px] font-bold text-amber-300">
                🔥 Offre de lancement : retrait dès ×1,5 jusqu'au 03/09/2026 !
              </span>
              <span className="text-[8px] text-amber-400/60">
                {new Date(promoEnd).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-white/30 text-[10px]">Chargement...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-4xl mb-4">🔍</span>
              <p className="text-white/30 text-[10px]">
                {filter === "tous"
                  ? "Aucune transaction"
                  : `Aucune transaction dans cette catégorie`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">
                      {getTransactionIcon(item.type, item.status)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-white/90">
                          {getTransactionLabel(item.type, item.status)}
                        </p>
                        <p className={`text-[11px] font-black ${getTransactionColor(item.type, item.amount, item.status)}`}>
                          {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString("fr-FR")} HTG
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {getStatusBadge(item.status)}
                        {item.bet && (
                          <p className="text-[9px] text-white/40">
                            Mise: {item.bet.toLocaleString("fr-FR")} HTG
                          </p>
                        )}
                        {item.netAmount && item.type === "withdraw" && (
                          <p className="text-[9px] text-white/40">
                            Net: {item.netAmount.toLocaleString("fr-FR")} HTG
                          </p>
                        )}
                        {item.fee && (
                          <p className="text-[9px] text-white/40">
                            Frais: {item.fee.toLocaleString("fr-FR")} HTG
                          </p>
                        )}
                      </div>

                      {item.failureReason && item.status === "failed" && (
                        <p className="mt-1 text-[9px] text-red-400">
                          {item.failureReason}
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


        {/* ==========================================
            NAVIGATION
        ========================================== */}

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">

          <div className="mx-auto flex h-[62px] w-full max-w-[430px] items-center justify-around px-4">

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >
              <span className="text-[18px]">🏠</span>
              Accueil
            </button>

            <button
              type="button"
              onClick={() => router.push("/wallet")}
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >
              <span className="text-[18px]">💼</span>
              Portefeuille
            </button>

            <button
              type="button"
              className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] font-bold text-blue-400"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-[17px] shadow-[0_3px_0_rgba(20,70,200,0.35)]">
                📜
              </span>
              Historique
            </button>

            <button
              type="button"
              onClick={() => router.push("/vylo")}
              className="relative flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
            >
              <span className="text-[18px]">👥</span>
              {totalNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg">
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              )}
              VYLO
            </button>

          </div>

        </nav>

      </div>

    </main>
  );
}