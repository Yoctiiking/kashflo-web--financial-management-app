"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  subscribeToSharedBudget, subscribeToSharedExpenses, addSharedExpense,
  deleteSharedExpense, createSharedBudgetInvite, getUserProfile,
  removeMemberFromSharedBudget,
  leaveSharedBudget,
  updateSharedExpense,
  subscribeToUserProfile
} from "@/lib/firebase/firestore";
import { SharedBudget, SharedExpense } from "@/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import CurrencyValue from "@/components/CurrencyValue";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/utils/months";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { useRouter } from "next/navigation";
import DeleteExpenseModal from "@/components/DeleteExpenseModal";
import { unshareExpenseToPersonal } from "@/lib/firebase/firestore";
import MigrateTransactionModal from "@/components/MigrateTransactionModal";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import SharedBudgetModal from "@/components/SharedBudgetModal";
import { Pencil, X, AlertTriangle } from "lucide-react";

const EXPIRY_OPTIONS = [
  { key: "expiry1h", minutes: 60 },
  { key: "expiry24h", minutes: 1440 },
  { key: "expiry7d", minutes: 10080 },
] as const;

export default function SharedBudgetDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { budgetId } = useParams<{ budgetId: string }>();
  const [budget, setBudget] = useState<SharedBudget | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<SharedExpense | null>(null);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [multipleUse, setMultipleUse] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(1440);
  const [copiedCode, setCopiedCode] = useState(false);
  const { formatCurrency, ready, symbol, toBase, fromBase } = useCurrency(); const confirm = useConfirm();
  const t = useTranslations("sharedBudgetDetail");
  const tMembers = useTranslations("sharedBudgetDetail.members");
  const tExpenses = useTranslations("sharedBudgetDetail.expenses");
  const { language } = useLanguage();
  const dateLocale = getDateFnsLocale(language);
  const [visibleSpentCount, setVisibleSpentCount] = useState(10);
  const [visibleMembersCount, setVisibleMembersCount] = useState(5);
  const [memberSearch, setMemberSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [showEditBudget, setShowEditBudget] = useState(false);

  // Filtrage des membres et dépenses selon la recherche
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return budget?.members || [];
    const term = memberSearch.toLowerCase();
    return (budget?.members || []).filter(uid =>
      (memberNames[uid] || uid).toLowerCase().includes(term)
    );
  }, [budget?.members, memberNames, memberSearch]);

  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return expenses;
    const term = expenseSearch.toLowerCase();
    return expenses.filter(e =>
      e.label.toLowerCase().includes(term) ||
      (e.addedByName || memberNames[e.addedBy] || "").toLowerCase().includes(term)
    );
  }, [expenses, expenseSearch, memberNames]);

  // Form état
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const isFormOpen = showAddExpense || !!editingExpense;

  // Écoute temps réel du budget
  useEffect(() => {
    if (!budgetId) return;
    const unsubscribe = subscribeToSharedBudget(budgetId, (data) => {
      setBudget(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [budgetId]);

  // Écoute temps réel des dépenses
  useEffect(() => {
    if (!budgetId) return;
    const unsubscribe = subscribeToSharedExpenses(budgetId, (data) => {
      setExpenses(data);
    });
    return () => unsubscribe();
  }, [budgetId]);

  // Charge les noms des membres à chaque changement du budget
  // Écoute temps réel des noms d'affichage des membres
  useEffect(() => {
    if (!budget) return;

    const unsubscribes = budget.members.map(uid =>
      subscribeToUserProfile(uid, (profile) => {
        setMemberNames(prev => ({
          ...prev,
          [uid]: profile?.displayName || uid
        }));
      })
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [budget?.members.join(",")]);

  const closeExpenseForm = useCallback(() => {
    setShowAddExpense(false);
    setEditingExpense(null);
    setLabel("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setFormError("");
  }, []);

  const handleToggleAddExpense = () => {
    if (showAddExpense) {
      closeExpenseForm();
    } else {
      setEditingExpense(null);
      setLabel("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setFormError("");
      setShowAddExpense(true);
    }
  };

  // Fermeture (avec annulation) sur clic extérieur ou touche Échap
  useEffect(() => {
    if (!isFormOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        closeExpenseForm();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeExpenseForm();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFormOpen, closeExpenseForm]);

  const handleSubmitExpense = async () => {
    if (!user || !label || !amount) {
      setFormError(t("errors.required"));
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError(t("errors.invalidAmount"));
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const [year, month, day] = date.split("-").map(Number);
      if (editingExpense) {
        await updateSharedExpense(budgetId, editingExpense.id, {
          amount: toBase(parseFloat(amount)),
          label,
          date: new Date(year, month - 1, day)
        });
      } else {
        await addSharedExpense(budgetId, {
          amount: toBase(parseFloat(amount)),
          label,
          date: new Date(year, month - 1, day),
          addedBy: user.uid,
          addedByName: user.displayName || "Utilisateur"
        });
      }
      closeExpenseForm();
    } catch (err) {
      console.error(err);
      setFormError(t("errors.generic"));
    } finally {
      setFormLoading(false);
    }
  };

  const startEditExpense = (expense: SharedExpense) => {
    setShowAddExpense(false);
    setEditingExpense(expense);
    setLabel(expense.label);
    setAmount(fromBase(expense.amount).toFixed(2));
    setDate(expense.date.toISOString().split("T")[0]);
    setFormError("");
  };

  const handleDeletePermanently = async () => {
    if (!deletingExpense) return;
    try {
      await deleteSharedExpense(budgetId, deletingExpense.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingExpense(null);
    }
  };

  const handleUnshare = async () => {
    if (!deletingExpense) return;
    try {
      await unshareExpenseToPersonal(budgetId, deletingExpense.id, {
        amount: deletingExpense.amount,
        label: deletingExpense.label,
        date: deletingExpense.date,
        addedBy: deletingExpense.addedBy
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingExpense(null);
    }
  };

  const handleInvite = async () => {
    if (!user || !budget) return;
    const code = await createSharedBudgetInvite(budgetId, user.uid, expiryMinutes, multipleUse);
    const link = `${window.location.origin}/join-budget/${budgetId}--${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleRemoveMember = async (uid: string) => {
    const ok = await confirm({
      title: tMembers("removeConfirm.title"),
      message: tMembers("removeConfirm.message"),
      confirmLabel: tMembers("removeConfirm.confirm"),
      danger: true
    });
    if (!ok) return;
    try {
      await removeMemberFromSharedBudget(budgetId, uid);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    const ok = await confirm({
      title: t("leaveConfirm.title"),
      message: t("leaveConfirm.message"),
      confirmLabel: t("leaveConfirm.confirm"),
      danger: true
    });
    if (!ok) return;
    try {
      await leaveSharedBudget(budgetId, user.uid);
      router.push("/shared-budgets");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setVisibleMembersCount(5);
  }, [memberSearch]);

  useEffect(() => {
    setVisibleSpentCount(10);
    if (editingExpense) {
      closeExpenseForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseSearch]);

  useEffect(() => {
    setVisibleSpentCount(10);
    setVisibleMembersCount(5);
  }, [budgetId]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const percentage = budget ? Math.min((totalSpent / budget.limit) * 100, 100) : 0;
  const isOver = budget ? totalSpent > budget.limit : false;
  const isAdmin = budget?.createdBy === user?.uid;

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
        <p className="text-gray-500">{t("notFound")}</p>
      </div>
    );
  }

  const renderExpenseForm = () => (
    <div ref={formRef} className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl space-y-3">
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder={tExpenses("descriptionPlaceholder")}
        className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          min="0"
          step="0.01"
          onChange={e => setAmount(e.target.value)}
          placeholder={tExpenses("amountPlaceholder")}
          className="flex-1 bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      {formError && <p className="text-red-600 dark:text-red-400 text-xs">{formError}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmitExpense}
          disabled={formLoading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {formLoading ? "..." : editingExpense ? tExpenses("formSubmitEdit") : tExpenses("formSubmitAdd")}
        </button>
        <button
          onClick={closeExpenseForm}
          className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm py-2.5 rounded-xl transition-colors"
        >
          {tExpenses("cancel")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{budget.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            {budget.category} · {t("memberCount", { count: budget.members.length })}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowEditBudget(true)}
            className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 px-3 py-2 rounded-xl transition-colors shrink-0"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">{t("edit")}</span>
          </button>
        )}
      </div>

      {/* Progression */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-baseline gap-2 text-sm mb-2">
          <span className={`inline-flex items-center gap-1 min-w-0 ${isOver ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white font-semibold"}`}>
            <CurrencyValue amount={totalSpent} ready={ready} formatCurrency={formatCurrency} />
            <span className="truncate">{t("spent")}</span>
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
            ? <><AlertTriangle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2} />{t("over")} <CurrencyValue amount={totalSpent - budget.limit} ready={ready} formatCurrency={formatCurrency} /></>
            : <><CurrencyValue amount={budget.limit - totalSpent} ready={ready} formatCurrency={formatCurrency} /> {t("remainingPercent", { percent: Math.round(percentage) })}</>
          }
        </p>
      </div>

      {/* Membres */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-white font-semibold">{tMembers("title")}</h3>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="text-emerald-600 dark:text-emerald-500 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {tMembers("invite")}
            </button>
          )}
        </div>

        {budget.members.length > 5 && (
          <input
            type="text"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder={tMembers("searchPlaceholder")}
            className="w-full mb-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        )}

        <div className="space-y-2">
          {filteredMembers.slice(0, visibleMembersCount).map(uid => (
            <div key={uid} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  {(memberNames[uid] || uid).charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {memberNames[uid] || uid}
                  {uid === budget.createdBy && (
                    <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{tMembers("admin")}</span>
                  )}
                </span>
              </div>
              {isAdmin && uid !== budget.createdBy && uid !== user?.uid && (
                <button
                  onClick={() => handleRemoveMember(uid)}
                  className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
                >
                  {tMembers("remove")}
                </button>
              )}
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <p className="text-gray-500 text-sm">{tMembers("empty")}</p>
          )}
        </div>

        {filteredMembers.length > visibleMembersCount && (
          <button
            onClick={() => setVisibleMembersCount(c => c + 5)}
            className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            {tMembers("showMore", { count: filteredMembers.length - visibleMembersCount })}
          </button>
        )}

        {budget.members.length > visibleMembersCount && (
          <button
            onClick={() => setVisibleMembersCount(c => c + 5)}
            className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            {tMembers("showMore", { count: budget.members.length - visibleMembersCount })}
          </button>
        )}

        {showInvite && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => setExpiryMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${expiryMinutes === opt.minutes
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                    }`}
                >
                  {tMembers(opt.key)}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setMultipleUse(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!multipleUse
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                {tMembers("singleUse")}
              </button>
              <button
                onClick={() => setMultipleUse(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${multipleUse
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                {tMembers("multipleUse")}
              </button>
            </div>

            <button
              onClick={handleInvite}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {copiedCode ? tMembers("linkCopied") : tMembers("generateLink")}
            </button>
          </div>
        )}
      </div>

      {/* Dépenses */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-white font-semibold">{tExpenses("title")}</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMigrateModal(true)}
              className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {tExpenses("fromTransactions")}
            </button>
            <button
              onClick={handleToggleAddExpense}
              className="text-emerald-600 dark:text-emerald-500 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {tExpenses("addButton")}
            </button>
          </div>
        </div>

        {showMigrateModal && (
          <MigrateTransactionModal
            budgetId={budgetId}
            onClose={() => setShowMigrateModal(false)}
            onSuccess={() => { }}
          />
        )}

        {showAddExpense && renderExpenseForm()}

        {expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">{tExpenses("empty")}</p>
        ) : (
          <>
            {expenses.length > 10 && (
              <input
                type="text"
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                placeholder={tExpenses("searchPlaceholder")}
                className="w-full mb-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            )}

            <div className="space-y-3">
              {filteredExpenses.slice(0, visibleSpentCount).map(expense => (
                editingExpense?.id === expense.id ? (
                  <div key={expense.id}>
                    {renderExpenseForm()}
                  </div>
                ) : (
                  <div key={expense.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{expense.label}</p>
                      <p className="text-gray-500 text-xs truncate">
                        {expense.addedByName || memberNames[expense.addedBy] || expense.addedBy} · {format(expense.date, "d MMM", { locale: dateLocale })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <CurrencyValue amount={expense.amount} ready={ready} formatCurrency={formatCurrency} className="text-red-600 dark:text-red-400 font-semibold text-sm" />
                      {expense.addedBy === user?.uid && (
                        <>
                          <button
                            onClick={() => startEditExpense(expense)}
                            className="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(expense)}
                            className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              ))}
              {filteredExpenses.length === 0 && (
                <p className="text-gray-500 text-sm">{tExpenses("noResults")}</p>
              )}
            </div>

            {filteredExpenses.length > visibleSpentCount && (
              <button
                onClick={() => setVisibleSpentCount(c => c + 10)}
                className="w-full mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                {tExpenses("showMore", { count: filteredExpenses.length - visibleSpentCount })}
              </button>
            )}
          </>
        )}
      </div>
      {!isAdmin && (
        <button
          onClick={handleLeave}
          className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20"
        >
          {t("leave")}
        </button>
      )}

      {deletingExpense && (
        <DeleteExpenseModal
          expenseLabel={deletingExpense.label}
          onDeletePermanently={handleDeletePermanently}
          onUnshare={handleUnshare}
          onCancel={() => setDeletingExpense(null)}
        />
      )}
      {showEditBudget && (
        <SharedBudgetModal
          userId={user!.uid}
          budget={budget}
          onClose={() => setShowEditBudget(false)}
          onSuccess={() => setShowEditBudget(false)}
        />
      )}
    </div>
  );
}