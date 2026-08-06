"use client";

import { useEffect, useState } from "react";
import { Wallet, Users, Loader2 } from "lucide-react";

export default function Home() {
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/public/total-balance");
        if (response.ok) {
          const data = await response.json();
          setTotalBalance(data.totalBalance || 0);
          setTotalUsers(data.totalUsers || 0);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des statistiques:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
          <p className="text-gray-300">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Statistiques du Site
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Solde Total */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-8 border border-blue-500/30 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <h2 className="text-lg font-medium text-gray-300 mb-2">Solde Total</h2>
              <p className="text-4xl font-bold text-white mb-2">
                {totalBalance?.toLocaleString("fr-HT")} HTG
              </p>
              <p className="text-sm text-gray-400">Montant total des utilisateurs</p>
            </div>

            {/* Nombre d'Utilisateurs */}
            <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl p-8 border border-green-500/30 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-lg font-medium text-gray-300 mb-2">Utilisateurs Inscrits</h2>
              <p className="text-4xl font-bold text-white mb-2">
                {totalUsers?.toLocaleString("fr-HT")}
              </p>
              <p className="text-sm text-gray-400">Nombre total de comptes</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}