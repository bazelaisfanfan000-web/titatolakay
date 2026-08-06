"use client";

import { useState, useEffect } from "react";
import { Wallet, Users, Loader2, Mail, Calendar, Home, Ban, ArrowDownLeft, ArrowUpRight, User, Bell, FileText, CreditCard, Share2, Copy, TrendingUp, BarChart3, Settings, Gift } from "lucide-react";

interface User {
  id: string;
  email?: string;
  balance: number;
  createdAt?: number;
  createdAtDate?: string;
}

type TabType = "home" | "users" | "banned" | "deposits" | "withdrawals" | "notifications" | "requests" | "subscription" | "referral";

export default function TotalBalancePage() {
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("home");

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
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "requests" as TabType, label: "Demandes", icon: FileText },
    { id: "subscription" as TabType, label: "Abonnement", icon: CreditCard },
    { id: "referral" as TabType, label: "Parrainage", icon: Gift },
    { id: "banned" as TabType, label: "Banned", icon: Ban },
    { id: "deposits" as TabType, label: "Dépôts", icon: ArrowDownLeft },
    { id: "withdrawals" as TabType, label: "Retraits", icon: ArrowUpRight },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Tableau de bord</h1>
              <p className="text-gray-300 text-lg">Bonjour, Fanfan</p>
              <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de vos paiements MonCash</p>
              <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Share2 className="w-4 h-4" />
                Recevez de l'argent
              </button>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Solde Disponible */}
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-sm font-medium text-gray-300 mb-2">SOLDE DISPONIBLE</h3>
                <p className="text-3xl font-bold text-white mb-1">{totalBalance?.toLocaleString("fr-HT")} HTG</p>
                <p className="text-xs text-gray-400 mb-4">Disponible pour retrait</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    Déposer
                  </button>
                  <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    Retirer
                  </button>
                </div>
              </div>

              {/* Plan Actuel */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-sm font-medium text-gray-300 mb-2">PLAN ACTUEL</h3>
                <p className="text-3xl font-bold text-white mb-1">Pro</p>
                <p className="text-xs text-gray-400 mb-4">0 % MCC — frais passerelle tiers uniquement</p>
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                  Retirer
                </button>
              </div>

              {/* Transactions 30J */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-500/30">
                <h3 className="text-sm font-medium text-gray-300 mb-2">TRANSACTIONS (30J)</h3>
                <p className="text-3xl font-bold text-white mb-1">{totalUsers || 0}</p>
                <p className="text-xs text-gray-400 mb-4">{(totalBalance || 0).toLocaleString("fr-HT")} HTG échangés</p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                  Mettre à niveau
                </button>
              </div>

              {/* Utilisé Aujourd'hui */}
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-6 border border-orange-500/30">
                <h3 className="text-sm font-medium text-gray-300 mb-2">UTILISÉ AUJOURD'HUI</h3>
                <p className="text-3xl font-bold text-white mb-1">0 HTG</p>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                </div>
                <p className="text-xs text-gray-400">0 % de 50 000 HTG</p>
              </div>
            </div>

            {/* Advanced Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume des paiements */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Volume des paiements
                  </h3>
                  <span className="text-sm text-gray-400">14 derniers jours</span>
                </div>
                <p className="text-2xl font-bold text-white mb-4">{(totalBalance || 0).toLocaleString("fr-HT")} HTG traitées</p>
                <div className="h-32 bg-gray-700/50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-gray-500" />
                  <span className="text-gray-500 ml-2">Graphique à venir</span>
                </div>
              </div>

              {/* Paiements récents */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Paiements récents
                </h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{user.email || "N/A"}</p>
                          <p className="text-xs text-gray-400 font-mono">{user.id.slice(0, 12)}...</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-green-400">
                        +{user.balance.toLocaleString("fr-HT")} HTG
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                MonCashConnect ne prend aucune commission. Les frais de dépôt (3 %) et de retrait (5 %) proviennent de prestataires tiers.
              </p>
            </div>

            {/* User Profile */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">BF</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Bazolet</p>
                    <p className="text-sm text-gray-400">bazelaisfanfan10@gmail.com</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Demander une nouvelle fonctionnalité
                  </button>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copier le lien
                  </button>
                </div>
              </div>
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

      case "notifications":
      case "requests":
      case "subscription":
      case "referral":
        return (
          <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Section en développement</h3>
            <p className="text-gray-400">Cette fonctionnalité sera bientôt disponible.</p>
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
      <div className="w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
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
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                    COMPTE
                  </div>
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
