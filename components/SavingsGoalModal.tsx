"use client";

import { useState } from "react";
import { addSavingsGoal, updateSavingsGoal } from "@/lib/firebase/firestore";
import { SavingsGoal } from "@/types";

interface Props {
  groupId: string;
  goal?: SavingsGoal;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SavingsGoalModal({ groupId, goal, onClose, onSuccess }: Props) {
  const [name, setName] = useState(goal?.name || "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() || "");
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount.toString() || "0");
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? goal.targetDate.toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!goal;

  const handleSubmit = async () => {
    if (!name || !targetAmount) {
      setError("Le nom et le montant cible sont obligatoires");
      return;
    }
    if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      setError("Le montant cible doit être un nombre positif");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let parsedDate: Date | undefined;
      if (targetDate) {
        const [year, month, day] = targetDate.split("-").map(Number);
        parsedDate = new Date(year, month - 1, day);
      }

      const data = {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: parsedDate
      };

      if (isEditing) {
        await updateSavingsGoal(groupId, goal.id, data);
      } else {
        await addSavingsGoal(groupId, data);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-white font-semibold text-lg">
            {isEditing ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nom de l'objectif</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ex: Vacances, Fonds d'urgence..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Montant cible ($)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Montant déjà épargné ($)</label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Date cible (optionnel)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "..." : isEditing ? "Sauvegarder" : "Créer l'objectif"}
          </button>
        </div>
      </div>
    </div>
  );
}