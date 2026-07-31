"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Wallet,
  Building2,
  Diamond,
  Users,
  Gamepad2,
  Activity,
  LogOut,
  UserCircle,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";

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
      router.push('/admin/login');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              💎 PlayToCash Admin
            </h1>
            <p className="text-gray-400">Tableau de bord administrateur sécurisé</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-all duration-200"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Finance Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Wallet className="text-purple-400" />
            Finance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Capital Total */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-500/20 p-3 rounded-xl">
                  <Wallet className="text-purple-400" size={32} />
                </div>
                <span className="text-purple-400 text-sm font-medium">Capital Total</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">Capital total des utilisateurs</p>
              <h3 className="text-3xl font-black text-white">
                {loading ? '...' : formatCurrency(financeData.totalUserCapital)}
              </h3>
            </motion.div>

            {/* Solde Plateforme */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <Diamond className="text-blue-400" size={32} />
                </div>
                <span className="text-blue-400 text-sm font-medium">Plateforme</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">Solde plateforme</p>
              <h3 className="text-3xl font-black text-white">
                {loading ? '...' : formatCurrency(financeData.platformBalance)}
              </h3>
            </motion.div>
          </div>
        </section>

        {/* Game Stats Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Gamepad2 className="text-cyan-400" />
            Statistiques du Jeu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <Users className="text-cyan-400" size={24} />
                <span className="text-gray-400 text-sm">Total Joueurs</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {loading ? '...' : gameStats.users.total}
              </h3>
              <p className="text-green-400 text-sm mt-1">
                +{gameStats.users.newToday} aujourd'hui
              </p>
            </motion.div>

            {/* Online Users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <Activity className="text-green-400" size={24} />
                <span className="text-gray-400 text-sm">En Ligne</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {loading ? '...' : gameStats.users.online}
              </h3>
              <p className="text-gray-500 text-sm mt-1">Actifs maintenant</p>
            </motion.div>

            {/* Total Games */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <Gamepad2 className="text-purple-400" size={24} />
                <span className="text-gray-400 text-sm">Total Parties</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {loading ? '...' : gameStats.games.total}
              </h3>
              <p className="text-purple-400 text-sm mt-1">
                +{gameStats.games.today} aujourd'hui
              </p>
            </motion.div>

            {/* Games In Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <Activity className="text-yellow-400" size={24} />
                <span className="text-gray-400 text-sm">En Cours</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {loading ? '...' : gameStats.games.inProgress}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {gameStats.games.completed} terminées
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <LayoutGrid className="text-pink-400" />
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/admin/users')}
              className="bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 text-left transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCircle className="text-cyan-400" size={32} />
                  <div>
                    <h3 className="text-white font-bold">Gestion Utilisateurs</h3>
                    <p className="text-gray-400 text-sm">Voir et gérer les joueurs</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/games')}
              className="bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 text-left transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="text-purple-400" size={32} />
                  <div>
                    <h3 className="text-white font-bold">Gestion Parties</h3>
                    <p className="text-gray-400 text-sm">Voir et gérer les parties</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/transactions')}
              className="bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 text-left transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="text-green-400" size={32} />
                  <div>
                    <h3 className="text-white font-bold">Transactions</h3>
                    <p className="text-gray-400 text-sm">Dépôts, retraits et gains</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
