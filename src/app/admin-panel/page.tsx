"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalUserCapital: 0,
    platformBalance: 0,
    totalUsers: 0,
  });
  const [gameStats, setGameStats] = useState({
    users: { total: 0, online: 0, newToday: 0 },
    games: { total: 0, today: 0, inProgress: 0, completed: 0 },
  });

  useEffect(() => {
    fetchFinanceData();
    fetchGameStats();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const response = await fetch('/api/admin/stats/finance');
      const data = await response.json();
      if (data.success) {
        setFinanceData(data.data);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameStats = async () => {
    try {
      const response = await fetch('/api/admin/stats/game');
      const data = await response.json();
      if (data.success) {
        setGameStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin-panel/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-[17px] font-black leading-none tracking-tight text-white">
                💎 Admin
              </h1>
              <p className="mt-1 text-[8px] font-medium leading-none text-white/35">
                Tableau de bord
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/[0.10] text-red-400 transition hover:bg-red-500/[0.16]"
            >
              ←
            </button>
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 pb-10 pt-[88px]">
          {/* Finance Section */}
          <section className="mt-4">
            <h2 className="text-[10px] font-medium text-white/35">
              💰 Finance
            </h2>
            <div className="mt-2 space-y-2">
              {/* Capital Total */}
              <div className="rounded-xl border border-blue-400/30 bg-blue-500/[0.10] p-3 shadow-[0_3px_0_rgba(30,64,175,0.65),0_0_15px_rgba(37,99,235,0.08)] backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-blue-100/40">Capital Total</p>
                    <p className="mt-1 text-[15px] font-black text-blue-300">
                      {loading ? '...' : formatCurrency(financeData.totalUserCapital)}
                    </p>
                  </div>
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
          </section>

          {/* Game Stats Section */}
          <section className="mt-6">
            <h2 className="text-[10px] font-medium text-white/35">
              🎮 Statistiques
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {/* Total Users */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[9px] text-white/40">Total Joueurs</p>
                <p className="mt-1 text-[15px] font-black text-white">
                  {loading ? '...' : gameStats.users.total}
                </p>
                <p className="mt-1 text-[8px] text-green-400">
                  +{gameStats.users.newToday} aujourd'hui
                </p>
              </div>

              {/* Online Users */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[9px] text-white/40">En Ligne</p>
                <p className="mt-1 text-[15px] font-black text-white">
                  {loading ? '...' : gameStats.users.online}
                </p>
                <p className="mt-1 text-[8px] text-white/30">Actifs maintenant</p>
              </div>

              {/* Total Games */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[9px] text-white/40">Total Parties</p>
                <p className="mt-1 text-[15px] font-black text-white">
                  {loading ? '...' : gameStats.games.total}
                </p>
                <p className="mt-1 text-[8px] text-purple-400">
                  +{gameStats.games.today} aujourd'hui
                </p>
              </div>

              {/* Games In Progress */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[9px] text-white/40">En Cours</p>
                <p className="mt-1 text-[15px] font-black text-white">
                  {loading ? '...' : gameStats.games.inProgress}
                </p>
                <p className="mt-1 text-[8px] text-white/30">
                  {gameStats.games.completed} terminées
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
