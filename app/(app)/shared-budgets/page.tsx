"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getSharedBudgets, deleteSharedBudget } from "@/lib/firebase/firestore";
import { SharedBudget } from "@/types";
import SharedBudgetModal from "@/components/SharedBudgetModal";
import { useCurrency } from "@/lib/hooks/useCurrency";
import CurrencyValue from "@/components/CurrencyValue";
import Link from "next/link";

const periodLabel: Record<string, string> = {
  daily: "/ jour",
  weekly: "/ semaine",
  monthly: "/ mois"
};

export default function SharedBudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<SharedBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<SharedBudget | null>(null);
  const { formatCurrency, ready } = useCurrency();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getSharedBudgets(user.uid);
      setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (budgetId: string) => {
    if (!confirm("Supprimer ce budget partagé ?")) return;
    try {
      await deleteSharedBudget(budgetId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets partagés</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{budgets.length} budget{budgets.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Nouveau
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">Aucun budget partagé</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm">Crée un budget et invite des membres à y contribuer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map(budget => (
            <Link
              key={budget.id}
              href={`/shared-budgets/${budget.id}`}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors block"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-semibold truncate">{budget.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{budget.category} · {periodLabel[budget.period]}</p>
                </div>
                {budget.createdBy === user?.uid && (
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
                    <button
                      onClick={() => setEditingBudget(budget)}
                      className="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <CurrencyValue amount={budget.limit} ready={ready} formatCurrency={formatCurrency} className="text-emerald-600 dark:text-emerald-400 font-semibold" />
              <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">
                {budget.members.length} membre{budget.members.length > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white text-2xl font-light rounded-full shadow-lg shadow-emerald-500/30 transition-colors z-40 flex items-center justify-center"
      >
        +
      </button>

      {showModal && user && (
        <SharedBudgetModal
          userId={user.uid}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}

      {editingBudget && user && (
        <SharedBudgetModal
          userId={user.uid}
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}