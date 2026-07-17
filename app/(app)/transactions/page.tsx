"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getMonthTransactions, deleteTransaction } from "@/lib/firebase/firestore";
import { Transaction } from "@/types";
import AddTransactionModal from "@/components/AddTransactionModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/lib/hooks/useCurrency";
import CurrencyValue from "@/components/CurrencyValue";
import { exportTransactionsToCSV, exportTransactionsToPDF } from "@/lib/utils/exportUtils";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import { MONTHS_FR } from "@/lib/utils/months";
import ExportRangeModal from "@/components/ExportRangeModal";
import { ArrowDownLeft, ArrowUpRight, Pencil, X } from "lucide-react";

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseMonthSearch(search: string): { month: number; year: number | null; remainder: string } | null {
  const normalized = normalize(search);
  for (let i = 0; i < MONTHS_FR.length; i++) {
    const monthNorm = normalize(MONTHS_FR[i]);
    if (normalized === monthNorm) {
      return { month: i, year: null, remainder: "" };
    }
    if (normalized.startsWith(monthNorm + " ")) {
      const rest = normalized.slice(monthNorm.length + 1).trim();
      const yearMatch = rest.match(/^(\d{4})\b/);
      if (yearMatch) {
        return { month: i, year: parseInt(yearMatch[1]), remainder: rest.slice(yearMatch[0].length).trim() };
      }
      return { month: i, year: null, remainder: rest };
    }
  }
  return null;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [search, setSearch] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportRangeModal, setShowExportRangeModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const confirm = useConfirm();

  useEffect(() => {
    const parsed = parseMonthSearch(search);
    if (!parsed) return;
    const targetYear = parsed.year ?? currentYear;
    const isFuture = targetYear > now.getFullYear() ||
      (targetYear === now.getFullYear() && parsed.month > now.getMonth());
    if (isFuture) return;
    if (parsed.month !== currentMonth || targetYear !== currentYear) {
      setCurrentMonth(parsed.month);
      setCurrentYear(targetYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleExportCSV = () => {
    const filenameSuffix = format(new Date(currentYear, currentMonth), "yyyy-MM");
    exportTransactionsToCSV(filtered, `transactions_${filenameSuffix}`, fromBase, currency);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const monthLabel = format(new Date(currentYear, currentMonth), "MMMM yyyy", { locale: fr });
    const filenameSuffix = format(new Date(currentYear, currentMonth), "yyyy-MM");
    exportTransactionsToPDF(filtered, `transactions_${filenameSuffix}`, monthLabel, formatCurrency, fromBase, currency);
    setShowExportMenu(false);
  };

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

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const tx = await getMonthTransactions(user.uid, currentYear, currentMonth);
      setTransactions(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  const handleDelete = async (transactionId: string) => {
    if (!user) return;
    const ok = await confirm({
      title: "Supprimer cette transaction ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true
    });
    if (!ok) return;
    try {
      await deleteTransaction(user.uid, transactionId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { formatCurrency, fromBase, currency, ready } = useCurrency();

  const parsedSearch = parseMonthSearch(search);
  const effectiveSearch = parsedSearch !== null ? parsedSearch.remainder : search;

  const filtered = transactions.filter(t => {
    const matchesFilter = filter === "all" ? true : t.type === filter;
    const matchesSearch = effectiveSearch === "" ||
      t.label.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(effectiveSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h2>
          <div className="flex items-center gap-3 mt-2 relative">
            <button
              onClick={goToPreviousMonth}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Mois précédent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={openMonthPicker}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm capitalize transition-colors"
            >
              {format(new Date(currentYear, currentMonth), "MMMM yyyy", { locale: fr })}
            </button>

            <button
              onClick={goToNextMonth}
              disabled={currentYear === now.getFullYear() && currentMonth === now.getMonth()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Mois suivant"
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
                    {MONTHS_FR.map((m, i) => {
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(s => !s)}
            className={`sm:hidden p-2.5 rounded-xl transition-colors ${showSearch ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            aria-label="Rechercher"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">Exporter</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden z-10 w-44">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    CSV (mois affiché)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    PDF (mois affiché)
                  </button>
                  <button
                    onClick={() => { setShowExportRangeModal(true); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-t border-gray-300 dark:border-gray-700"
                  >
                    Plage de mois...
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Filtres + Recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(["all", "expense", "income"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${filter === f
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              {f === "all" ? "Tout" : f === "expense" ? "Dépenses" : "Revenus"}
            </button>
          ))}
        </div>

        <div className={`relative sm:ml-auto ${showSearch ? "block" : "hidden sm:block"}`}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, catégorie, ou mois (ex: juin)"
            autoFocus={showSearch}
            className="w-full sm:w-56 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-4 pr-9 py-2.5 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune transaction</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}>
                    {tx.type === "income"
                      ? <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                      : <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{tx.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {tx.category} · {format(tx.date, "d MMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <CurrencyValue
                    amount={tx.amount}
                    ready={ready}
                    formatCurrency={formatCurrency}
                    prefix={tx.type === "income" ? "+" : "-"}
                    className={`font-semibold ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  />
                  <button
                    onClick={() => setEditingTransaction(tx)}
                    className="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white text-2xl font-light rounded-full shadow-lg shadow-emerald-500/30 transition-colors z-40 flex items-center justify-center"
      >
        +
      </button>

      {/* Modale */}
      {showModal && user && (
        <AddTransactionModal
          groupId={user.uid}
          onClose={() => setShowModal(false)}
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

      {showExportRangeModal && user && (
        <ExportRangeModal
          userId={user.uid}
          onClose={() => setShowExportRangeModal(false)}
        />
      )}
    </div>
  );
}