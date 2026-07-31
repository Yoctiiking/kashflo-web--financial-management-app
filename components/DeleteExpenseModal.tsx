"use client";

import { useTranslations } from "next-intl";

interface Props {
  expenseLabel: string;
  onDeletePermanently: () => void;
  onUnshare: () => void;
  onCancel: () => void;
}

export default function DeleteExpenseModal({ expenseLabel, onDeletePermanently, onUnshare, onCancel }: Props) {
  const t = useTranslations("deleteExpenseModal");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">{t("title", { label: expenseLabel })}</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          {t("description")}
        </p>

        <div className="space-y-3">
          <button
            onClick={onUnshare}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            {t("unshare")}
            <span className="block text-xs text-gray-500 mt-0.5">{t("unshareDescription")}</span>
          </button>

          <button
            onClick={onDeletePermanently}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20 text-sm"
          >
            {t("deletePermanently")}
          </button>

          <button
            onClick={onCancel}
            data-escape-cancel
            className="w-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium py-3 rounded-xl transition-colors text-sm"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}