"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getMonthTransactions, deleteTransaction } from "@/lib/firebase/firestore";
import { Transaction } from "@/types";
import AddTransactionModal from "@/components/AddTransactionModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setGroupId(profile.groupId);
      const tx = await getMonthTransactions(profile.groupId);
      setTransactions(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (transactionId: string) => {
    if (!groupId) return;
    if (!confirm("Supprimer cette transaction ?")) return;
    try {
      await deleteTransaction(groupId, transactionId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(amount);

  const filtered = transactions.filter(t =>
    filter === "all" ? true : t.type === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Transactions</h2>
          <p className="text-gray-400 mt-1 text-sm">Ce mois-ci</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {(["all", "expense", "income"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
          >
            {f === "all" ? "Tout" : f === "expense" ? "Dépenses" : "Revenus"}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune transaction</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}>
                    {tx.type === "income" ? "💰" : "💸"}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{tx.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {tx.category} · {format(tx.date, "d MMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale */}
      {showModal && groupId && (
        <AddTransactionModal
          groupId={groupId}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}