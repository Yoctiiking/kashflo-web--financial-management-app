"use client";

import { useState } from "react";
import { addBudget } from "@/lib/firebase/firestore";
import { BudgetPeriod } from "@/types";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

interface Props {
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBudgetModal({ groupId, onClose, onSuccess }: Props) {
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!category || !limit) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    if (isNaN(parseFloat(limit)) || parseFloat(limit) <= 0) {
      setError("Le montant doit être un nombre positif");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addBudget(groupId, {
        category,
        limit: parseFloat(limit),
        period
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

  const periodLabel = {
    daily: "/ jour",
    weekly: "/ semaine",
    monthly: "/ mois"
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Nouveau budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Catégorie */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Sélectionner...</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Limite */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Limite ($)</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Période</label>
            <div className="flex bg-gray-800 rounded-xl p-1">
              {(["daily", "weekly", "monthly"] as BudgetPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Création..." : "Créer le budget"}
          </button>
        </div>
      </div>
    </div>
  );
}