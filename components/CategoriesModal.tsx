"use client";

import { useEffect, useState } from "react";
import { TransactionType } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { updateUserCategories } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";

interface Props {
  onClose: () => void;
}

export default function CategoriesModal({ onClose }: Props) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [type, setType] = useState<TransactionType>("expense");
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    (profile?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES).filter(c => c !== "Autre")
  );
  const [incomeCategories, setIncomeCategories] = useState<string[]>(
    (profile?.incomeCategories ?? DEFAULT_INCOME_CATEGORIES).filter(c => c !== "Autre")
  );
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Se resynchronise si le profil arrive après le montage (chargement initial)
  useEffect(() => {
    if (profile?.expenseCategories) {
      setExpenseCategories(profile.expenseCategories.filter(c => c !== "Autre"));
    }
  }, [profile?.expenseCategories]);

  useEffect(() => {
    if (profile?.incomeCategories) {
      setIncomeCategories(profile.incomeCategories.filter(c => c !== "Autre"));
    }
  }, [profile?.incomeCategories]);

  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const setCategories = type === "expense" ? setExpenseCategories : setIncomeCategories;

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || trimmed === "Autre" || categories.includes(trimmed)) return;
    setCategories([...categories, trimmed]);
    setNewCategory("");
  };

  const handleDelete = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(categories[index]);
  };

  const commitEditing = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== "Autre" && !categories.some((c, i) => i !== editingIndex && c === trimmed)) {
      setCategories(categories.map((c, i) => (i === editingIndex ? trimmed : c)));
    }
    setEditingIndex(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      await updateUserCategories(user.uid, "expense", [...expenseCategories, "Autre"]);
      await updateUserCategories(user.uid, "income", [...incomeCategories, "Autre"]);
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Catégories</h2>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-6 shrink-0">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "expense" ? "bg-red-500/20 text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              Dépenses
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === "income" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              Revenus
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {categories.map((cat, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5">
              {editingIndex === index ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEditing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEditing();
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none min-w-0"
                />
              ) : (
                <span className="flex-1 text-gray-900 dark:text-white text-sm truncate">{cat}</span>
              )}
              <button onClick={() => startEditing(index)} className="text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm shrink-0">
                ✏️
              </button>
              <button onClick={() => handleDelete(index)} className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm shrink-0">
                ✕
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Aucune catégorie</p>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-3">
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="Nouvelle catégorie"
            />
            <button
              onClick={handleAdd}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium px-4 rounded-xl transition-colors"
            >
              +
            </button>
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
