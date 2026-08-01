"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  Search,
  Filter,
  Shield
} from "lucide-react";

export default function AdminReferralPage() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRewards, setAllRewards] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReferrers: 0,
    totalReferrals: 0,
    totalCommissions: 0,
    activeReferrals: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch("/api/admin/referral/stats", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setAllUsers(data.users || []);
        setAllRewards(data.rewards || []);
        setStats(data.stats || {
          totalReferrers: 0,
          totalReferrals: 0,
          totalCommissions: 0,
          activeReferrals: 0
        });
      }
    } catch (error) {
      console.error("[ADMIN_REFERRAL] Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(user => {
    if (filter === "active") {
      const now = Date.now();
      return user.referredBy && (user.referralEndDate || 0) > now;
    }
    if (filter === "expired") {
      const now = Date.now();
      return user.referredBy && (user.referralEndDate || 0) <= now;
    }
    return true;
  }).filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.referralCode?.toLowerCase().includes(search)
    );
  });

  const filteredRewards = allRewards.filter(reward => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reward.gameId?.toLowerCase().includes(search) ||
      reward.referrerId?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-3 text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-3 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-white/30">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#05070b] px-4 pb-24 pt-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl transition-all hover:bg-white/[0.05]"
          >
            <ArrowLeft size={20} className="text-white/50" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/[0.1]">
              <Shield size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-black tracking-[0.15em] text-purple-400">
              ADMIN PARRAINAGE
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <Users size={16} className="text-blue-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Parrains
              </span>
            </div>
            <p className="text-2xl font-black">{stats.totalReferrers}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <Users size={16} className="text-green-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Filleuls
              </span>
            </div>
            <p className="text-2xl font-black">{stats.totalReferrals}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-yellow-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Commissions
              </span>
            </div>
            <p className="text-2xl font-black">{stats.totalCommissions} HTG</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Actifs
              </span>
            </div>
            <p className="text-2xl font-black">{stats.activeReferrals}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher utilisateur, email, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/40"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "all"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                  : "bg-white/[0.02] text-white/60 border border-white/[0.07] hover:bg-white/[0.05]"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-400/30"
                  : "bg-white/[0.02] text-white/60 border border-white/[0.07] hover:bg-white/[0.05]"
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setFilter("expired")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "expired"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-400/30"
                  : "bg-white/[0.02] text-white/60 border border-white/[0.07] hover:bg-white/[0.05]"
              }`}
            >
              Expirés
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <h2 className="text-sm font-bold text-white/80">Utilisateurs ({filteredUsers.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Parrain
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Inscrit le
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 50).map((user) => {
                  const now = Date.now();
                  const referralEndDate = user.referralEndDate || 0;
                  const isActive = user.referredBy && referralEndDate > now;
                  
                  return (
                    <tr key={user.uid} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-white/80">{user.username || "N/A"}</p>
                          <p className="text-[10px] text-white/40">{user.email || "N/A"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-blue-400">{user.referralCode || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/60">{user.referredBy || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.referredBy ? (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            isActive ? 'bg-green-500/[0.2] text-green-400' : 'bg-orange-500/[0.2] text-orange-400'
                          }`}>
                            {isActive ? 'Actif' : 'Expiré'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/60">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-HT") : "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <h2 className="text-sm font-bold text-white/80">Commissions ({filteredRewards.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Parrain
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Filleul
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Game ID
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Perte
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRewards.slice(0, 50).map((reward) => (
                  <tr key={reward.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">{reward.referrerId?.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">{reward.referredUserId?.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-blue-400">{reward.gameId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">{reward.lostAmount} HTG</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-green-400">+{reward.commissionAmount} HTG</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">
                        {reward.createdAt ? new Date(reward.createdAt).toLocaleDateString("fr-HT") : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
