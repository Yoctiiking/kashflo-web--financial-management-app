"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getBudgets, getMonthTransactions, deleteBudget } from "@/lib/firebase/firestore";
import { Budget, Transaction } from "@/types";
import BudgetModal from "@/components/BudgetModal";
import { useCurrency } from "@/lib/hooks/useCurrency";

export default function BudgetsPage() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setGroupId(profile.groupId);

      const [userBudgets, monthTx] = await Promise.all([
        getBudgets(profile.groupId),
        getMonthTransactions(profile.groupId)
      ]);

      setBudgets(userBudgets);
      setTransactions(monthTx);
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
    if (!groupId) return;
    try {
      await deleteBudget(groupId, budgetId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getSpent = (budget: Budget) => {
    return transactions
      .filter(t => {
        if (t.type !== "expense" || t.category !== budget.category) return false;

        if (budget.period === "daily") {
          const today = new Date();
          return (
            t.date.getDate() === today.getDate() &&
            t.date.getMonth() === today.getMonth() &&
            t.date.getFullYear() === today.getFullYear()
          );
        }

        if (budget.period === "weekly") {
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return t.date >= startOfWeek;
        }

        return true;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const { formatCurrency } = useCurrency();

  const periodLabel: Record<string, string> = {
    daily: "/ jour",
    weekly: "/ semaine",
    monthly: "/ mois"
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Budgets</h2>
          <p className="text-gray-400 mt-1 text-sm">{budgets.length} budget{budgets.length > 1 ? "s" : ""} actif{budgets.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">+ Nouveau budget</span>
        </button>
      </div>

      {/* Liste des budgets */}
      {budgets.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">Aucun budget défini</p>
          <p className="text-gray-600 text-sm">Crée un budget pour suivre tes dépenses par catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const spent = getSpent(budget);
            const percentage = Math.min((spent / budget.limit) * 100, 100);
            const isOver = spent > budget.limit;
            const remaining = budget.limit - spent;

            return (
              <div key={budget.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                {/* Header carte */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold">{budget.category}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{periodLabel[budget.period]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingBudget(budget)}
                      className="text-gray-600 hover:text-emerald-400 transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    |
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Montants */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={isOver ? "text-red-400" : "text-gray-300"}>
                      {formatCurrency(spent)} dépensé
                    </span>
                    <span className="text-gray-500">
                      {formatCurrency(budget.limit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Reste */}
                <p className={`text-xs ${isOver ? "text-red-400" : "text-gray-500"}`}>
                  {isOver
                    ? `⚠️ Dépassé de ${formatCurrency(Math.abs(remaining))}`
                    : `${formatCurrency(remaining)} restant`
                  }
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale */}
      {showModal && groupId && (
        <BudgetModal
          groupId={groupId}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}

      {editingBudget && groupId && (
        <BudgetModal
          groupId={groupId}
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}