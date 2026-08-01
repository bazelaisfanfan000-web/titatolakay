"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

import { motion } from "framer-motion";

import { 
  Users, 
  TrendingUp, 
  Gift,
  ArrowLeft,
  Download
} from "lucide-react";

export default function AdminReferralsPage() {
  const router = useRouter();
  const user = auth.currentUser;

  const [totalReferrers, setTotalReferrers] = useState(0);
  const [totalReferred, setTotalReferred] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [referralList, setReferralList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Vérifier si l'utilisateur est admin (à adapter selon votre système d'auth admin)
    const checkAdmin = async () => {
      const adminRef = ref(database, `users/${user.uid}/isAdmin`);
      onValue(adminRef, (snapshot) => {
        if (!snapshot.exists() || !snapshot.val()) {
          router.push("/dashboard");
        }
      });
    };

    checkAdmin();

    // Récupérer les statistiques globales
    const usersRef = ref(database, "users");
    onValue(usersRef, (snapshot) => {
      const users: any[] = [];
      let referrerCount = 0;
      let referredCount = 0;

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const userData = child.val();
          users.push(userData);
          
          if (userData.referralCode) {
            referrerCount++;
          }
          
          if (userData.referredBy) {
            referredCount++;
          }
        });
      }

      setTotalReferrers(referrerCount);
      setTotalReferred(referredCount);
      setLoading(false);
    });

    // Récupérer les récompenses de parrainage
    const rewardsRef = ref(database, "referralRewards");
    onValue(rewardsRef, (snapshot) => {
      let total = 0;
      const rewards: any[] = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const reward = child.val();
          total += reward.commissionAmount;
          rewards.push(reward);
        });
      }

      setTotalCommissions(total);
      
      // Trier par date décroissante
      rewards.sort((a, b) => b.createdAt - a.createdAt);
      setReferralList(rewards);
    });
  }, [user, router]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-HT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const exportCSV = () => {
    const headers = ["ID", "Parrain ID", "Filleul ID", "ID Partie", "Montant Perte", "Commission", "Date"];
    const rows = referralList.map(reward => [
      reward.id,
      reward.referrerId,
      reward.referredUserId,
      reward.gameId,
      reward.lostAmount,
      reward.commissionAmount,
      formatDate(reward.createdAt)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrals_${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-3 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-[10px] text-white/30">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#05070b] px-3 pb-20 pt-4 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[600px]"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl"
          >
            <ArrowLeft size={14} className="text-white/50" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-400/10 bg-purple-500/[0.06]">
              <Gift size={14} className="text-purple-400" />
            </div>
            <span className="text-[10px] font-black tracking-[0.15em] text-purple-400">
              ADMIN PARRAINAGE
            </span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-blue-400" />
              <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">
                Parrains
              </span>
            </div>
            <p className="text-xl font-black">{totalReferrers}</p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-green-400" />
              <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">
                Filleuls
              </span>
            </div>
            <p className="text-xl font-black">{totalReferred}</p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={12} className="text-purple-400" />
              <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">
                Commissions
              </span>
            </div>
            <p className="text-xl font-black text-purple-400">{totalCommissions} HTG</p>
          </div>
        </div>

        {/* Export button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-500/[0.10] px-3 py-2 text-[9px] font-bold text-purple-100 shadow-[0_3px_0_rgba(147,51,234,0.65)] transition-all hover:border-purple-300/50 hover:bg-purple-500/[0.16] active:translate-y-[2px] active:shadow-none"
          >
            <Download size={12} />
            Exporter CSV
          </button>
        </div>

        {/* Referral list */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-3">
            Historique des commissions
          </p>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {referralList.length === 0 ? (
              <p className="text-[9px] text-white/30 text-center py-4">
                Aucune commission pour le moment
              </p>
            ) : (
              referralList.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-purple-400">
                      +{reward.commissionAmount} HTG
                    </p>
                    <p className="text-[7px] text-white/30 truncate">
                      {reward.referrerId} → {reward.referredUserId}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-[8px] text-white/50">
                      {formatDate(reward.createdAt)}
                    </p>
                    <p className="text-[7px] text-white/30">
                      Partie: {reward.gameId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
