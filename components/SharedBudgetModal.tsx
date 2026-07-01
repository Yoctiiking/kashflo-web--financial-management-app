"use client";

import { useState } from "react";
import { createSharedBudget, updateSharedBudget } from "@/lib/firebase/firestore";
import { SharedBudget, BudgetPeriod } from "@/types";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

interface Props {
  userId: string;
  budget?: SharedBudget;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SharedBudgetModal({ userId, budget, onClose, onSuccess }: Props) {
  const [name, setName] = useState(budget?.name || "");
  const [category, setCategory] = useState(budget?.category || "");
  const [limit, setLimit] = useState(budget?.limit.toString() || "");
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || "monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!budget;

  const periodLabel = { daily: "/ jour", weekly: "/ semaine", monthly: "/ mois" };

  const handleSubmit = async () => {
    if (!name || !category || !limit) {
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
      if (isEditing) {
        await updateSharedBudget(budget.id, { name, category, limit: parseFloat(limit), period });
      } else {
        await createSharedBudget({ name, category, limit: parseFloat(limit), period, createdBy: userId });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-white font-semibold text-lg">
            {isEditing ? "Modifier le budget" : "Nouveau budget partagé"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-8 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nom du budget</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ex: Courses de la semaine"
            />
          </div>

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
            {loading ? "..." : isEditing ? "Sauvegarder" : "Créer le budget"}
          </button>
        </div>
      </div>
    </div>
  );
}