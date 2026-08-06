"use client";

import { useState, useEffect } from "react";
import { Wallet, Users, Loader2 } from "lucide-react";

export default function TotalBalancePage() {
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchTotalBalance();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Solde Total des Utilisateurs
            </h1>
            <p className="text-gray-300">
              Statistiques financières globales
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
            <div className="space-y-6">
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
          )}
        </div>
      </div>
    </div>
  );
}
