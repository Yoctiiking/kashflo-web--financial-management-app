"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useParams } from "next/navigation";
import { getBudgets, getMonthTransactions, deleteTransaction } from "@/lib/firebase/firestore";
import { Budget, Transaction } from "@/types";
import { getBudgetSpent, getBudgetTransactions } from "@/lib/utils/budgetUtils";
import { useCurrency } from "@/lib/hooks/useCurrency";
import CurrencyValue from "@/components/CurrencyValue";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import BudgetModal from "@/components/BudgetModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import { Pencil, X, AlertTriangle } from "lucide-react";

const periodLabel: Record<string, string> = {
  daily: "/ jour",
  weekly: "/ semaine",
  monthly: "/ mois"
};

export default function BudgetDetailPage() {
  const { user } = useAuth();
  const { budgetId } = useParams<{ budgetId: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [search, setSearch] = useState("");
  const { formatCurrency, ready } = useCurrency();
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [budgets, monthTx] = await Promise.all([
        getBudgets(user.uid),
        getMonthTransactions(user.uid)
      ]);
      setBudget(budgets.find(b => b.id === budgetId) ?? null);
      setTransactions(monthTx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, budgetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(10);
  }, [search]);

  const budgetTransactions = useMemo(
    () => (budget ? getBudgetTransactions(transactions, budget) : []),
    [transactions, budget]
  );

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return budgetTransactions;
    const term = search.toLowerCase();
    return budgetTransactions.filter(t => t.label.toLowerCase().includes(term));
  }, [budgetTransactions, search]);

  const handleDelete = async (transaction: Transaction) => {
    if (!user) return;
    const ok = await confirm({
      title: "Supprimer cette transaction ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true
    });
    if (!ok) return;
    try {
      await deleteTransaction(user.uid, transaction.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const spent = budget ? getBudgetSpent(transactions, budget) : 0;
  const percentage = budget ? Math.min((spent / budget.limit) * 100, 100) : 0;
  const isOver = budget ? spent > budget.limit : false;
  const remaining = budget ? budget.limit - spent : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Budget introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{budget.category}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{periodLabel[budget.period]}</p>
        </div>
        <button
          onClick={() => setShowEditBudget(true)}
          className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 px-3 py-2 rounded-xl transition-colors shrink-0"
        >
          <Pencil className="w-4 h-4" strokeWidth={2} />
          <span className="hidden sm:inline">Modifier</span>
        </button>
      </div>

      {/* Progression */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-baseline gap-2 text-sm mb-2">
          <span className={`inline-flex items-center gap-1 min-w-0 ${isOver ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white font-semibold"}`}>
            <CurrencyValue amount={spent} ready={ready} formatCurrency={formatCurrency} />
            <span className="truncate">dépensé</span>
          </span>
          <CurrencyValue amount={budget.limit} ready={ready} formatCurrency={formatCurrency} className="text-gray-600 dark:text-gray-400 shrink-0" />
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className={`text-xs ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
          {isOver
            ? <><AlertTriangle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2} />Dépassé de <CurrencyValue amount={Math.abs(remaining)} ready={ready} formatCurrency={formatCurrency} /></>
            : <><CurrencyValue amount={remaining} ready={ready} formatCurrency={formatCurrency} /> restant · {Math.round(percentage)}%</>
          }
        </p>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-white font-semibold">Transactions</h3>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="text-emerald-600 dark:text-emerald-500 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            + Ajouter
          </button>
        </div>

        {budgetTransactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune transaction pour l'instant</p>
        ) : (
          <>
            {budgetTransactions.length > 10 && (
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une transaction..."
                className="w-full mb-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            )}

            <div className="space-y-3">
              {filteredTransactions.slice(0, visibleCount).map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{t.label}</p>
                    <p className="text-gray-500 text-xs truncate">{format(t.date, "d MMM", { locale: fr })}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <CurrencyValue amount={t.amount} ready={ready} formatCurrency={formatCurrency} className="text-red-600 dark:text-red-400 font-semibold text-sm" />
                    <button
                      onClick={() => setEditingTransaction(t)}
                      className="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-gray-500 text-sm">Aucune transaction trouvée</p>
              )}
            </div>

            {filteredTransactions.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(c => c + 10)}
                className="w-full mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                Voir plus ({filteredTransactions.length - visibleCount} restantes)
              </button>
            )}
          </>
        )}
      </div>

      {showEditBudget && (
        <BudgetModal
          groupId={user!.uid}
          budget={budget}
          onClose={() => setShowEditBudget(false)}
          onSuccess={loadData}
        />
      )}

      {showAddTransaction && user && (
        <AddTransactionModal
          groupId={user.uid}
          defaultCategory={budget.category}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={loadData}
        />
      )}

      {editingTransaction && user && (
        <AddTransactionModal
          groupId={user.uid}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
