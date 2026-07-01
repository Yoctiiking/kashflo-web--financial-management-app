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
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [customDays, setCustomDays] = useState("10");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const frequencyLabel: Record<RecurrenceFrequency, string> = {
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    yearly: "Annuel",
    custom: "Personnalisé"
  };

  const handleNext = () => {
    if (!amount || !label || !category) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Le montant doit être un nombre positif");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (frequency === "custom") {
      const days = parseInt(customDays);
      if (isNaN(days) || days < 2) {
        setError("L'intervalle personnalisé doit être d'au moins 2 jours");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const [year, month, day] = startDate.split("-").map(Number);
      await addRecurrence(groupId, {
        amount: parseFloat(amount),
        type,
        category,
        label,
        frequency,
        customDays: frequency === "custom" ? parseInt(customDays) : undefined,
        nextOccurrence: new Date(year, month - 1, day)
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 max-h-[85vh] flex flex-col">
        {/* En-tête fixe */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">Nouvelle récurrence</h2>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`h-1.5 rounded-full transition-all ${step === 1 ? "w-6 bg-emerald-500" : "w-6 bg-emerald-500/40"}`} />
              <div className={`h-1.5 rounded-full transition-all ${step === 2 ? "w-6 bg-emerald-500" : "w-6 bg-gray-700"}`} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-8 space-y-4">
          {step === 1 && (
            <>
              {/* Type */}
              <div className="flex bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => { setType("expense"); setCategory(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "expense" ? "bg-red-500/20 text-red-400" : "text-gray-400 hover:text-white"
                    }`}
                >
                  Dépense
                </button>
                <button
                  onClick={() => { setType("income"); setCategory(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-gray-400 hover:text-white"
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

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleNext}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Suivant
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Fréquence */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Fréquence</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["daily", "weekly", "monthly", "yearly", "custom"] as RecurrenceFrequency[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${frequency === f
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gray-800 text-gray-400 hover:text-white border border-transparent"
                        }`}
                    >
                      {frequencyLabel[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervalle personnalisé */}
              {frequency === "custom" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Tous les combien de jours ?
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Ex: 14"
                      min="2"
                    />
                    <span className="text-gray-400 text-sm whitespace-nowrap">jours</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-1.5">
                    {parseInt(customDays) >= 2
                      ? `Tous les ${customDays} jours`
                      : "Minimum 2 jours"
                    }
                  </p>
                </div>
              )}

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

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {loading ? "Création..." : "Créer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}