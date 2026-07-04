"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useParams } from "next/navigation";
import {
  subscribeToSharedBudget, subscribeToSharedExpenses, addSharedExpense,
  deleteSharedExpense, createSharedBudgetInvite, getUserProfile,
  removeMemberFromSharedBudget,
  leaveSharedBudget,
  updateSharedExpense
} from "@/lib/firebase/firestore";
import { SharedBudget, SharedExpense } from "@/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import DeleteExpenseModal from "@/components/DeleteExpenseModal";
import { unshareExpenseToPersonal } from "@/lib/firebase/firestore";
import MigrateTransactionModal from "@/components/MigrateTransactionModal";

const EXPIRY_OPTIONS = [
  { label: "1 heure", minutes: 60 },
  { label: "24 heures", minutes: 1440 },
  { label: "7 jours", minutes: 10080 },
];

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
  const { formatCurrency } = useCurrency();

  // Form état
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

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
  useEffect(() => {
    if (!budget) return;
    const loadNames = async () => {
      const names: Record<string, string> = {};
      await Promise.all(budget.members.map(async uid => {
        const profile = await getUserProfile(uid);
        names[uid] = profile?.displayName || uid;
      }));
      setMemberNames(names);
    };
    loadNames();
  }, [budget]);

  const handleSubmitExpense = async () => {
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
      if (editingExpense) {
        await updateSharedExpense(budgetId, editingExpense.id, {
          amount: parseFloat(amount),
          label,
          date: new Date(year, month - 1, day)
        });
      } else {
        await addSharedExpense(budgetId, {
          amount: parseFloat(amount),
          label,
          date: new Date(year, month - 1, day),
          addedBy: user.uid,
          addedByName: user.displayName || "Utilisateur"
        });
      }
      setLabel(""); setAmount(""); setDate(new Date().toISOString().split("T")[0]);
      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (err) {
      console.error(err);
      setFormError("Erreur lors de l'enregistrement");
    } finally {
      setFormLoading(false);
    }
  };

  const startEditExpense = (expense: SharedExpense) => {
    setEditingExpense(expense);
    setLabel(expense.label);
    setAmount(expense.amount.toString());
    setDate(expense.date.toISOString().split("T")[0]);
    setShowAddExpense(true);
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
    if (!confirm("Retirer ce membre du budget ?")) return;
    try {
      await removeMemberFromSharedBudget(budgetId, uid);
      // Plus besoin de loadData() — le listener met à jour automatiquement
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!confirm("Quitter ce budget partagé ?")) return;
    try {
      await leaveSharedBudget(budgetId, user.uid);
      router.push("/shared-budgets");
    } catch (err) {
      console.error(err);
    }
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
            <div key={uid} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              {isAdmin && uid !== budget.createdBy && uid !== user?.uid && (
                <button
                  onClick={() => handleRemoveMember(uid)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                >
                  Retirer
                </button>
              )}
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
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${expiryMinutes === opt.minutes
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-gray-800 text-gray-400 border border-transparent"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setMultipleUse(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!multipleUse
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
                  }`}
              >
                🔒 Usage unique
              </button>
              <button
                onClick={() => setMultipleUse(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${multipleUse
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
                  }`}
              >
                ♾️ Usages multiples
              </button>
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
          <div className="flex gap-3">
            <button
              onClick={() => setShowMigrateModal(true)}
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              📥 Depuis mes transactions
            </button>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors"
            >
              + Ajouter
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
                min="0"
                step="0.01"
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
                onClick={handleSubmitExpense}
                disabled={formLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {formLoading ? "..." : editingExpense ? "Modifier" : "Ajouter"}
              </button>
              <button
                onClick={() => { setShowAddExpense(false); setEditingExpense(null); setLabel(""); setAmount(""); }}
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
                    {expense.addedByName || memberNames[expense.addedBy] || expense.addedBy} · {format(expense.date, "d MMM", { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-red-400 font-semibold text-sm">{formatCurrency(expense.amount)}</p>
                  {expense.addedBy === user?.uid && (
                    <>
                      <button
                        onClick={() => startEditExpense(expense)}
                        className="text-gray-600 hover:text-emerald-400 transition-colors text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeletingExpense(expense)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isAdmin && (
        <button
          onClick={handleLeave}
          className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20"
        >
          Quitter ce budget partagé
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
    </div>
  );
}