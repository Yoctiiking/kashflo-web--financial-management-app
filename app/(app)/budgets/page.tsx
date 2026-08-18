"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getBudgets, getMonthTransactions, deleteBudget } from "@/lib/firebase/firestore";
import { Budget, Transaction } from "@/types";
import BudgetModal from "@/components/BudgetModal";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import CurrencyValue from "@/components/CurrencyValue";
import { getMonthNames, getDateFnsLocale } from "@/lib/utils/months";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { Pencil, X, AlertTriangle } from "lucide-react";

function BudgetsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const now = new Date();
  // ?year=&month= — passé par le bouton "Voir plus" du dashboard pour arriver
  // directement sur le mois qui y était affiché. Retombe sur le mois réel actuel
  // si absent ou invalide ; navigable ensuite depuis cette page.
  const yearParam = parseInt(searchParams.get("year") ?? "", 10);
  const monthParam = parseInt(searchParams.get("month") ?? "", 10);
  const initialYear = !isNaN(yearParam) ? yearParam : now.getFullYear();
  const initialMonth = !isNaN(monthParam) && monthParam >= 0 && monthParam <= 11 ? monthParam : now.getMonth();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [pickerYear, setPickerYear] = useState(initialYear);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const confirm = useConfirm();
  const t = useTranslations("budgets");
  const tPeriod = useTranslations("common.period");
  const { language } = useLanguage();
  const monthNames = getMonthNames(language);
  const dateLocale = getDateFnsLocale(language);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [userBudgets, monthTx] = await Promise.all([
        getBudgets(user.uid),
        getMonthTransactions(user.uid, currentYear, currentMonth)
      ]);

      setBudgets(userBudgets);
      setTransactions(monthTx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openMonthPicker = () => {
    setPickerYear(currentYear);
    setShowMonthPicker(true);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!user) return;
    const ok = await confirm({
      title: t("deleteConfirm.title"),
      message: t("deleteConfirm.message"),
      confirmLabel: t("deleteConfirm.confirm"),
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

  // Somme sur tout le mois affiché pour tous les types de période (journalier/
  // hebdomadaire inclus) — "aujourd'hui"/"cette semaine" réels n'ont pas de sens
  // une fois qu'on peut naviguer vers un mois passé. Comportement volontairement
  // différent de lib/utils/budgetUtils.ts (page détail budget, sans navigation).
  const getSpent = (budget: Budget) =>
    transactions
      .filter(t => t.type === "expense" && t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);

  const { formatCurrency, displayAmount, ready } = useCurrency();

  const periodLabel: Record<string, string> = {
    daily: tPeriod("daily"),
    weekly: tPeriod("weekly"),
    monthly: tPeriod("monthly")
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{t("activeCount", { count: budgets.length })}</p>
          <div className="flex items-center gap-3 mt-2 relative">
            <button
              onClick={goToPreviousMonth}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label={t("prevMonth")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={openMonthPicker}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm capitalize transition-colors"
            >
              {format(new Date(currentYear, currentMonth), "MMMM yyyy", { locale: dateLocale })}
            </button>

            <button
              onClick={goToNextMonth}
              disabled={currentYear === now.getFullYear() && currentMonth === now.getMonth()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t("nextMonth")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {showMonthPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMonthPicker(false)}
                />

                <div className="absolute top-full left-0 mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-4 z-20 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setPickerYear(y => y - 1)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="text-gray-900 dark:text-white text-sm font-medium">{pickerYear}</span>
                    <button
                      onClick={() => setPickerYear(y => y + 1)}
                      disabled={pickerYear >= now.getFullYear()}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {monthNames.map((m, i) => {
                      const isFuture = pickerYear === now.getFullYear() && i > now.getMonth();
                      const isSelected = pickerYear === currentYear && i === currentMonth;
                      return (
                        <button
                          key={m}
                          disabled={isFuture}
                          onClick={() => {
                            setCurrentMonth(i);
                            setCurrentYear(pickerYear);
                            setShowMonthPicker(false);
                          }}
                          className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isSelected
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                          {m.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          {t("new")}
        </button>
      </div>

      {/* Liste des budgets */}
      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">{t("emptyTitle")}</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm">{t("emptyDescription")}</p>
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
                      <span className="truncate">{t("spent")}</span>
                    </span>
                    <CurrencyValue amount={budget.limit} ready={ready} formatCurrency={(amt) => displayAmount(amt, budget.originalAmount, budget.originalCurrency)} className="text-gray-500 shrink-0" />
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
                    ? <><AlertTriangle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2} />{t("over")} <CurrencyValue amount={Math.abs(remaining)} ready={ready} formatCurrency={formatCurrency} /></>
                    : <><CurrencyValue amount={remaining} ready={ready} formatCurrency={formatCurrency} /> {t("remaining")}</>
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

export default function BudgetsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BudgetsPageContent />
    </Suspense>
  );
}