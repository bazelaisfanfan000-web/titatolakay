"use client";

import { useState, useEffect } from "react";
import { Wallet, Users, Loader2, Mail, Calendar, Home, Ban, ArrowDownLeft, ArrowUpRight, User } from "lucide-react";

interface User {
  id: string;
  email?: string;
  balance: number;
  createdAt?: number;
  createdAtDate?: string;
}

type TabType = "users" | "banned" | "deposits" | "withdrawals" | "home";

export default function TotalBalancePage() {
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("users");

  useEffect(() => {
    async function fetchTotalBalance() {
      try {
        const response = await fetch("/api/public/total-balance");
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des données");
        }
        const data = await response.json();
        setTotalBalance(data.totalBalance || 0);
        setTotalUsers(data.totalUsers || 0);
        setUsers(data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchTotalBalance();
  }, []);

  const tabs = [
    { id: "home" as TabType, label: "Accueil", icon: Home },
    { id: "users" as TabType, label: "Utilisateurs", icon: User },
    { id: "banned" as TabType, label: "Banned", icon: Ban },
    { id: "deposits" as TabType, label: "Dépôts", icon: ArrowDownLeft },
    { id: "withdrawals" as TabType, label: "Retraits", icon: ArrowUpRight },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-lg">Solde Total</span>
                  <Wallet className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">
                  {totalBalance?.toLocaleString("fr-HT")} HTG
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-lg">Nombre d'Utilisateurs</span>
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-4xl font-bold text-white">
                  {totalUsers?.toLocaleString("fr-HT")}
                </p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
              <p className="text-sm text-gray-400 text-center">
                Moyenne par utilisateur:{" "}
                <span className="text-white font-semibold">
                  {totalUsers && totalUsers > 0 && totalBalance !== null
                    ? (totalBalance / totalUsers).toFixed(2)
                    : "0"}{" "}
                  HTG
                </span>
              </p>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Solde
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date d'inscription
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        Aucun utilisateur inscrit
                      </td>
                    </tr>
                  ) : (
                    users.map((user, index) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-700/30 transition-colors ${
                          index % 2 === 0 ? "bg-gray-800/30" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-400 font-mono text-sm">
                            {user.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-300">
                            {user.email || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-white font-semibold">
                            {user.balance.toLocaleString("fr-HT")} HTG
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-400 text-sm">
                            {user.createdAtDate || "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "banned":
        return (
          <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
            <Ban className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Utilisateurs Bannis</h3>
            <p className="text-gray-400">Cette fonctionnalité sera bientôt disponible.</p>
          </div>
        );

      case "deposits":
        return (
          <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
            <ArrowDownLeft className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Historique des Dépôts</h3>
            <p className="text-gray-400">Cette fonctionnalité sera bientôt disponible.</p>
          </div>
        );

      case "withdrawals":
        return (
          <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
            <ArrowUpRight className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Historique des Retraits</h3>
            <p className="text-gray-400">Cette fonctionnalité sera bientôt disponible.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Solde Total des Utilisateurs
            </h1>
            <p className="text-gray-300">
              Tableau de bord administratif
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-gray-300">Chargement des données...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:w-64 flex-shrink-0">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          activeTab === tab.id
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {renderContent()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
