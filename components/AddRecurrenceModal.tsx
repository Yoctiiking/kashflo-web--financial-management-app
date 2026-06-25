"use client";

import { useState } from "react";
import { addRecurrence } from "@/lib/firebase/firestore";
import { TransactionType, RecurrenceFrequency } from "@/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

interface Props {
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRecurrenceModal({ groupId, onClose, onSuccess }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const frequencyLabel: Record<RecurrenceFrequency, string> = {
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    yearly: "Annuel"
  };

  const handleSubmit = async () => {
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
      await addRecurrence(groupId, {
        amount: parseFloat(amount),
        type,
        category,
        label,
        frequency,
        nextOccurrence: new Date(startDate)
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Nouvelle récurrence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          {/* Type */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "expense" ? "bg-red-500/20 text-red-400" : "text-gray-400 hover:text-white"
              }`}
            >
              Dépense
            </button>
            <button
              onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-gray-400 hover:text-white"
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
              placeholder="Ex: Loyer"
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

          {/* Fréquence */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Fréquence</label>
            <div className="grid grid-cols-2 gap-2">
              {(["daily", "weekly", "monthly", "yearly"] as RecurrenceFrequency[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    frequency === f
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-800 text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  {frequencyLabel[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Date de début */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Première occurrence</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Création..." : "Créer la récurrence"}
          </button>
        </div>
      </div>
    </div>
  );
}