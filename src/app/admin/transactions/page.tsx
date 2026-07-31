"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Filter,
  Calendar,
} from "lucide-react";

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter, period]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (period !== 'all') params.append('period', period);

      const response = await fetch(`/api/admin/transactions?${params.toString()}`);
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
        return <ArrowDown className="text-green-400" size={20} />;
      case 'withdraw':
        return <ArrowUp className="text-red-400" size={20} />;
      case 'reward':
        return <TrendingUp className="text-purple-400" size={20} />;
      case 'commission':
        return <Wallet className="text-blue-400" size={20} />;
      default:
        return <Wallet className="text-gray-400" size={20} />;
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
      default:
        return type;
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-HT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-800/50 hover:bg-gray-700/50 p-3 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="text-white" size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              💰 Transactions
            </h1>
            <p className="text-gray-400">Historique complet des transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <span className="text-gray-400 text-sm">Type:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tous</option>
                <option value="deposit">Dépôts</option>
                <option value="withdraw">Retraits</option>
                <option value="reward">Gains</option>
                <option value="commission">Commissions</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" size={20} />
              <span className="text-gray-400 text-sm">Période:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Toutes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Chargement...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-12 border border-gray-700 text-center">
            <Wallet className="text-gray-500 mx-auto mb-4" size={48} />
            <p className="text-gray-400">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.transactionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-700/50 p-3 rounded-xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">
                        {getTransactionLabel(transaction.type)}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        ID: {transaction.uid?.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {transaction.type === 'withdraw' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount || 0))}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>

                {transaction.status && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
