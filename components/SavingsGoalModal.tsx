"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { addSavingsGoal, updateSavingsGoal } from "@/lib/firebase/firestore";
import { SavingsGoal } from "@/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { X } from "lucide-react";

interface Props {
  groupId: string;
  goal?: SavingsGoal;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SavingsGoalModal({ groupId, goal, onClose, onSuccess }: Props) {
  const t = useTranslations("savingsGoalModal");
  const { symbol, toBase, fromBase, ready } = useCurrency();
  const [name, setName] = useState(goal?.name || "");
  const [targetAmount, setTargetAmount] = useState(
    goal && ready ? fromBase(goal.targetAmount).toFixed(2) : ""
  );
  const [currentAmount, setCurrentAmount] = useState(
    goal && ready ? fromBase(goal.currentAmount).toFixed(2) : "0"
  );
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? goal.targetDate.toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (goal && ready) {
      setTargetAmount(fromBase(goal.targetAmount).toFixed(2));
      setCurrentAmount(fromBase(goal.currentAmount).toFixed(2));
    }
  }, [ready, goal, fromBase]);

  const isEditing = !!goal;

  const handleSubmit = async () => {
    if (!name || !targetAmount) {
      setError(t("errors.required"));
      return;
    }
    if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      setError(t("errors.invalidAmount"));
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
        targetAmount: toBase(parseFloat(targetAmount)),
        currentAmount: toBase(parseFloat(currentAmount) || 0),
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

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("targetAmountLabel", { symbol })}</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("currentAmountLabel", { symbol })}</label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("targetDateLabel")}</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
            />
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