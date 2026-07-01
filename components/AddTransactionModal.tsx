"use client";

import { useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { addTransaction } from "@/lib/firebase/firestore";
import { TransactionType } from "@/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

interface Props {
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({ groupId, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
      await addTransaction(groupId, {
        amount: parseFloat(amount),
        type,
        category,
        label,
        date: new Date(`${date}T00:00:00`),
        addedBy: user.uid
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-white font-semibold text-lg">Nouvelle transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-8 space-y-4">
          {/* Type toggle */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "expense"
                  ? "bg-red-500/20 text-red-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Dépense
            </button>
            <button
              onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "income"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Revenu
            </button>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Montant ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Description</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ex: Épicerie Metro"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Sélectionner...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Ajout en cours..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}