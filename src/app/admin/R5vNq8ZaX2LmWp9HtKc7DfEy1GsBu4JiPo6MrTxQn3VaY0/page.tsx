"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/transactions');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'withdraw':
        return '💸';
      case 'reward':
        return '🏆';
      case 'commission':
        return '💎';
      case 'bet':
        return '🎮';
      case 'GAME_WIN':
        return '🏆';
      case 'GAME_LOSS':
        return '😢';
      default:
        return '📋';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Dépôt';
      case 'withdraw':
        return 'Retrait';
      case 'reward':
        return 'Gain';
      case 'commission':
        return 'Commission';
      case 'bet':
        return 'Mise';
      case 'GAME_WIN':
        return 'Partie gagnée';
      case 'GAME_LOSS':
        return 'Partie perdue';
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-400';
    if (amount < 0) return 'text-red-400';
    return 'text-white/70';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-HT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-[17px] font-black leading-none tracking-tight text-white">
                💰 Transactions
              </h1>
              <p className="mt-1 text-[8px] font-medium leading-none text-white/35">
                Historique complet
              </p>
            </div>

            <div className="w-10" />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 pb-10 pt-[88px]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-white/50">Chargement...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-4">💰</p>
              <p className="text-white/50">Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.transactionId}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-xl">
                      {getTransactionIcon(transaction.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-white/90">
                          {getTransactionLabel(transaction.type)}
                        </p>
                        <p className={`text-[11px] font-black ${getTransactionColor(transaction.type, transaction.amount)}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount || 0))}
                        </p>
                      </div>

                      <p className="mt-1 text-[9px] text-white/30">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>

                  {transaction.status && (
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-[8px] font-medium ${
                          transaction.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
