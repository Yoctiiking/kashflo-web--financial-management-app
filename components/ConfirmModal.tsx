"use client";

import { useTranslations } from "next-intl";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel
}: Props) {
  const t = useTranslations("common.confirmModal");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            data-escape-cancel
            className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-medium py-3 rounded-xl transition-colors text-gray-900 dark:text-white ${
              danger
                ? "bg-red-500 hover:bg-red-400"
                : "bg-emerald-500 hover:bg-emerald-400"
            }`}
          >
            {confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}