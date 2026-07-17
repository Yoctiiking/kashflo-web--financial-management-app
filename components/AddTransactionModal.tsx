"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { addTransaction, updateTransaction } from "@/lib/firebase/firestore";
import { Transaction, TransactionType } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import CategorySelect from "@/components/CategorySelect";
import { X } from "lucide-react";

interface Props {
  groupId: string;
  transaction?: Transaction; // si fourni, mode édition
  defaultCategory?: string; // ex: ouvert depuis un budget — verrouille type "dépense" + cette catégorie
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({ groupId, transaction, defaultCategory, onClose, onSuccess }: Props) {
  const { symbol, toBase, fromBase, formatCurrency, ready } = useCurrency(); const { user } = useAuth();
  const { profile } = useUserProfile();
  const isEditing = !!transaction;
  const lockCategory = !isEditing && !!defaultCategory;
  const [type, setType] = useState<TransactionType>(transaction?.type || "expense");
  const [amount, setAmount] = useState(
    transaction && ready ? fromBase(transaction.amount).toFixed(2) : ""
  );
  const [label, setLabel] = useState(transaction?.label || "");
  const [category, setCategory] = useState(transaction?.category || defaultCategory || "");
  const [date, setDate] = useState(
    transaction ? transaction.date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction && ready) {
      setAmount(fromBase(transaction.amount).toFixed(2));
    }
  }, [ready, transaction, fromBase]);

  const categories = type === "expense"
    ? (profile?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES)
    : (profile?.incomeCategories ?? DEFAULT_INCOME_CATEGORIES);

  const handleSubmit = async () => {
    if (!user) return;
    if (!amount || !label || !category) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Le montant doit être un nombre positif");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing) {
        await updateTransaction(groupId, transaction.id, {
          amount: toBase(parseFloat(amount)),
          type,
          category,
          label,
          date: new Date(`${date}T00:00:00`)
        });
      } else {
        await addTransaction(groupId, {
          amount: toBase(parseFloat(amount)),
          type,
          category,
          label,
          date: new Date(`${date}T00:00:00`),
          addedBy: user.uid
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(isEditing ? "Erreur lors de la modification" : "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">
            {isEditing ? "Modifier la transaction" : "Nouvelle transaction"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
          {/* Type toggle */}
          {lockCategory ? (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl">
              Dépense · {defaultCategory}
            </div>
          ) : (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => { setType("expense"); setCategory(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "expense"
                  ? "bg-red-500/20 text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                Dépense
              </button>
              <button
                onClick={() => { setType("income"); setCategory(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "income"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                Revenu
              </button>
            </div>
          )}

          {/* Montant */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Montant ({symbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ex: Épicerie Metro"
            />
          </div>

          {/* Catégorie */}
          {!lockCategory && <CategorySelect categories={categories} value={category} onChange={setCategory} />}

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading
              ? (isEditing ? "Sauvegarde..." : "Ajout en cours...")
              : (isEditing ? "Sauvegarder" : "Ajouter")}
          </button>
        </div>
      </div>
    </div>
  );
}