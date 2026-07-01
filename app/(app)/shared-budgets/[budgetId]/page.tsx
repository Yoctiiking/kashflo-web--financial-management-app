"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useParams } from "next/navigation";
import {
  getSharedBudgets, getSharedExpenses, addSharedExpense,
  deleteSharedExpense, createSharedBudgetInvite, getUserProfile
} from "@/lib/firebase/firestore";
import { SharedBudget, SharedExpense } from "@/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

const EXPIRY_OPTIONS = [
  { label: "1 heure", minutes: 60 },
  { label: "24 heures", minutes: 1440 },
  { label: "7 jours", minutes: 10080 },
];

export default function SharedBudgetDetailPage() {
  const { user } = useAuth();
  const { budgetId } = useParams<{ budgetId: string }>();
  const [budget, setBudget] = useState<SharedBudget | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(1440);
  const [copiedCode, setCopiedCode] = useState(false);
  const { formatCurrency } = useCurrency();

  // Form état
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [allBudgets, budgetExpenses] = await Promise.all([
        getSharedBudgets(user.uid),
        getSharedExpenses(budgetId)
      ]);
      const found = allBudgets.find(b => b.id === budgetId) || null;
      setBudget(found);
      setExpenses(budgetExpenses);

      if (found) {
        const names: Record<string, string> = {};
        await Promise.all(found.members.map(async uid => {
          const profile = await getUserProfile(uid);
          names[uid] = profile?.displayName || uid;
        }));
        setMemberNames(names);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, budgetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExpense = async () => {
    if (!user || !label || !amount) {
      setFormError("Tous les champs sont obligatoires");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError("Le montant doit être un nombre positif");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const [year, month, day] = date.split("-").map(Number);
      await addSharedExpense(budgetId, {
        amount: parseFloat(amount),
        label,
        date: new Date(year, month - 1, day),
        addedBy: user.uid
      });
      setLabel(""); setAmount(""); setDate(new Date().toISOString().split("T")[0]);
      setShowAddExpense(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setFormError("Erreur lors de l'ajout");
    } finally {
      setFormLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!user || !budget) return;
    const code = await createSharedBudgetInvite(budgetId, user.uid, expiryMinutes, false);
    const link = `${window.location.origin}/join-budget/${budgetId}--${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

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
        <p className="text-gray-500">Budget introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">{budget.name}</h2>
        <p className="text-gray-400 mt-1 text-sm">
          {budget.category} · {budget.members.length} membre{budget.members.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Progression */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className={isOver ? "text-red-400 font-semibold" : "text-white font-semibold"}>
            {formatCurrency(totalSpent)} dépensé
          </span>
          <span className="text-gray-400">{formatCurrency(budget.limit)}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className={`text-xs ${isOver ? "text-red-400" : "text-gray-500"}`}>
          {isOver
            ? `⚠️ Dépassé de ${formatCurrency(totalSpent - budget.limit)}`
            : `${formatCurrency(budget.limit - totalSpent)} restant · ${Math.round(percentage)}%`
          }
        </p>
      </div>

      {/* Membres */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Membres</h3>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors"
            >
              + Inviter
            </button>
          )}
        </div>
        <div className="space-y-2">
          {budget.members.map(uid => (
            <div key={uid} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-semibold">
                {(memberNames[uid] || uid).charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-300 text-sm">
                {memberNames[uid] || uid}
                {uid === budget.createdBy && (
                  <span className="ml-2 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Admin</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {showInvite && (
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => setExpiryMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    expiryMinutes === opt.minutes
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-800 text-gray-400 border border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleInvite}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {copiedCode ? "✅ Lien copié !" : "Générer et copier le lien"}
            </button>
          </div>
        )}
      </div>

      {/* Dépenses */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Dépenses</h3>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors"
          >
            + Ajouter
          </button>
        </div>

        {showAddExpense && (
          <div className="mb-4 p-4 bg-gray-800 rounded-xl space-y-3">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Description"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Montant"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddExpense}
                disabled={formLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {formLoading ? "..." : "Ajouter"}
              </button>
              <button
                onClick={() => setShowAddExpense(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune dépense pour l'instant</p>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{expense.label}</p>
                  <p className="text-gray-500 text-xs">
                    {memberNames[expense.addedBy] || expense.addedBy} · {format(expense.date, "d MMM", { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-red-400 font-semibold text-sm">{formatCurrency(expense.amount)}</p>
                  {expense.addedBy === user?.uid && (
                    <button
                      onClick={() => deleteSharedExpense(budgetId, expense.id).then(loadData)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}