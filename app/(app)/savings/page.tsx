"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getSavingsGoals, deleteSavingsGoal, addToSavingsGoal } from "@/lib/firebase/firestore";
import { SavingsGoal } from "@/types";
import SavingsGoalModal from "@/components/SavingsGoalModal";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SavingsPage() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");

  const { formatCurrency } = useCurrency();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setGroupId(profile.groupId);
      const data = await getSavingsGoals(profile.groupId);
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (goalId: string) => {
    if (!groupId) return;
    try {
      await deleteSavingsGoal(groupId, goalId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAmount = async (goalId: string) => {
    if (!groupId || !addAmount) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await addToSavingsGoal(groupId, goalId, amount);
      setAddingTo(null);
      setAddAmount("");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Objectifs d'épargne</h2>
          <p className="text-gray-400 mt-1 text-sm">{goals.length} objectif{goals.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Nouvel objectif
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">Aucun objectif d'épargne</p>
          <p className="text-gray-600 text-sm">Crée un objectif pour suivre ta progression</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isComplete = goal.currentAmount >= goal.targetAmount;
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold">{goal.name}</p>
                    {goal.targetDate && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        Objectif : {format(goal.targetDate, "d MMM yyyy", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="text-gray-600 hover:text-emerald-400 transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={isComplete ? "text-emerald-400" : "text-gray-300"}>
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-gray-500">
                      {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <p className={`text-xs mb-3 ${isComplete ? "text-emerald-400" : "text-gray-500"}`}>
                  {isComplete
                    ? "🎉 Objectif atteint !"
                    : `${formatCurrency(remaining)} restant · ${Math.round(percentage)}%`
                  }
                </p>

                {addingTo === goal.id ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddAmount(goal.id); if (e.key === "Escape") { setAddingTo(null); setAddAmount(""); } }}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Montant à ajouter"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddAmount(goal.id)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => { setAddingTo(null); setAddAmount(""); }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm py-2 rounded-xl transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(goal.id)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-emerald-400 text-sm font-medium py-2 rounded-xl transition-colors"
                  >
                    + Ajouter un montant
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white text-2xl font-light rounded-full shadow-lg shadow-emerald-500/30 transition-colors z-40 flex items-center justify-center"
      >
        +
      </button>

      {showModal && groupId && (
        <SavingsGoalModal
          groupId={groupId}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}

      {editingGoal && groupId && (
        <SavingsGoalModal
          groupId={groupId}
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}