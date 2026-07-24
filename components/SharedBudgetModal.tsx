"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createSharedBudget, updateSharedBudget } from "@/lib/firebase/firestore";
import { SharedBudget, BudgetPeriod } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/categories";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import CategorySelect from "@/components/CategorySelect";
import { X } from "lucide-react";

interface Props {
  userId: string;
  budget?: SharedBudget;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SharedBudgetModal({ userId, budget, onClose, onSuccess }: Props) {
  const t = useTranslations("sharedBudgetModal");
  const tPeriod = useTranslations("common.period");
  const { profile } = useUserProfile();
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || "monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { symbol, toBase, fromBase, ready } = useCurrency();
  const [name, setName] = useState(budget?.name || "");
  const [category, setCategory] = useState(budget?.category || "");
  const categories = profile?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES;
  const [limit, setLimit] = useState(
    budget && ready ? fromBase(budget.limit).toFixed(2) : ""
  );

  useEffect(() => {
    if (budget && ready) {
      setLimit(fromBase(budget.limit).toFixed(2));
    }
  }, [ready, budget, fromBase]);

  const isEditing = !!budget;

  const periodLabel = { daily: tPeriod("daily"), weekly: tPeriod("weekly"), monthly: tPeriod("monthly") };

  const handleSubmit = async () => {
    if (!name || !category || !limit) {
      setError(t("errors.required"));
      return;
    }
    if (isNaN(parseFloat(limit)) || parseFloat(limit) <= 0) {
      setError(t("errors.invalidAmount"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing) {
        await updateSharedBudget(budget.id, { name, category, limit: toBase(parseFloat(limit)), period });
      } else {
        await createSharedBudget({ name, category, limit: toBase(parseFloat(limit)), period, createdBy: userId });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">
            {isEditing ? t("editTitle") : t("newTitle")}
          </h2>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("nameLabel")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder={t("namePlaceholder")}
            />
          </div>

          <CategorySelect categories={categories} value={category} onChange={setCategory} />

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("limitLabel", { symbol })}</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("periodLabel")}</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(["daily", "weekly", "monthly"] as BudgetPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "..." : isEditing ? t("save") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}