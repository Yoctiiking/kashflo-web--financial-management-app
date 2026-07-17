"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getBudgets, getMonthTransactions, deleteBudget } from "@/lib/firebase/firestore";
import { Budget, Transaction } from "@/types";
import BudgetModal from "@/components/BudgetModal";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import CurrencyValue from "@/components/CurrencyValue";
import { getBudgetSpent } from "@/lib/utils/budgetUtils";
import { Pencil, X, AlertTriangle } from "lucide-react";

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const confirm = useConfirm();


  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [userBudgets, monthTx] = await Promise.all([
        getBudgets(user.uid),
        getMonthTransactions(user.uid)
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
    if (!user) return;
    const ok = await confirm({
      title: "Supprimer ce budget ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true
    });
    if (!ok) return;
    try {
      await deleteBudget(user.uid, budgetId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getSpent = (budget: Budget) => getBudgetSpent(transactions, budget);

  const { formatCurrency, ready } = useCurrency();

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{budgets.length} budget{budgets.length > 1 ? "s" : ""} actif{budgets.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Nouveau budget
        </button>
      </div>

      {/* Liste des budgets */}
      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">Aucun budget défini</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm">Crée un budget pour suivre tes dépenses par catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const spent = getSpent(budget);
            const percentage = Math.min((spent / budget.limit) * 100, 100);
            const isOver = spent > budget.limit;
            const remaining = budget.limit - spent;

            return (
              <Link
                key={budget.id}
                href={`/budgets/${budget.id}`}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors block"
              >
                {/* Header carte */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-gray-900 dark:text-white font-semibold">{budget.category}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{periodLabel[budget.period]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
                    <button
                      onClick={() => setEditingBudget(budget)}
                      className="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Montants */}
                <div className="mb-3">
                  <div className="flex justify-between items-baseline gap-2 text-sm mb-1.5">
                    <span className={`inline-flex items-center gap-1 min-w-0 ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                      <CurrencyValue amount={spent} ready={ready} formatCurrency={formatCurrency} />
                      <span className="truncate">dépensé</span>
                    </span>
                    <CurrencyValue amount={budget.limit} ready={ready} formatCurrency={formatCurrency} className="text-gray-500 shrink-0" />
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Reste */}
                <p className={`text-xs ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                  {isOver
                    ? <><AlertTriangle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2} />Dépassé de <CurrencyValue amount={Math.abs(remaining)} ready={ready} formatCurrency={formatCurrency} /></>
                    : <><CurrencyValue amount={remaining} ready={ready} formatCurrency={formatCurrency} /> restant</>
                  }
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white text-2xl font-light rounded-full shadow-lg shadow-emerald-500/30 transition-colors z-40 flex items-center justify-center"
      >
        +
      </button>

      {/* Modale */}
      {showModal && user && (
        <BudgetModal
          groupId={user.uid}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}

      {editingBudget && user && (
        <BudgetModal
          groupId={user.uid}
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}