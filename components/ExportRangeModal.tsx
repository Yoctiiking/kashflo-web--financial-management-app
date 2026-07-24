"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { getTransactionsInRange } from "@/lib/firebase/firestore";
import { exportTransactionsToCSV, exportTransactionsToPDF } from "@/lib/utils/exportUtils";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { getMonthNames } from "@/lib/utils/months";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { X } from "lucide-react";

interface Props {
  userId: string;
  onClose: () => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ExportRangeModal({ userId, onClose }: Props) {
  const now = new Date();
  const [fromMonth, setFromMonth] = useState(0);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const { formatCurrency, fromBase, currency } = useCurrency();
  const { language } = useLanguage();
  const monthNames = getMonthNames(language);
  const t = useTranslations("exportRangeModal");

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const isRangeValid = fromYear < toYear || (fromYear === toYear && fromMonth <= toMonth);

  const handleExport = async (type: "csv" | "pdf") => {
    if (!isRangeValid) {
      setError(t("errorRange"));
      return;
    }
    setError("");
    setLoading(type);
    try {
      const startDate = new Date(fromYear, fromMonth, 1);
      const endDate = new Date(toYear, toMonth + 1, 0, 23, 59, 59, 999);
      const transactions = await getTransactionsInRange(userId, startDate, endDate);

      const filenameSuffix = `${format(startDate, "yyyy-MM")}_a_${format(endDate, "yyyy-MM")}`;
      const rangeLabel = `${capitalize(monthNames[fromMonth])} ${fromYear} — ${capitalize(monthNames[toMonth])} ${toYear}`;

      if (type === "csv") {
        exportTransactionsToCSV(transactions, `transactions_${filenameSuffix}`, fromBase, currency);
      } else {
        exportTransactionsToPDF(transactions, `transactions_${filenameSuffix}`, rangeLabel, formatCurrency, fromBase, currency);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("errorExport"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">{t("title")}</h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("from")}</label>
            <div className="flex gap-2">
              <select
                value={fromMonth}
                onChange={e => setFromMonth(Number(e.target.value))}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i}>{capitalize(m)}</option>
                ))}
              </select>
              <select
                value={fromYear}
                onChange={e => setFromYear(Number(e.target.value))}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("to")}</label>
            <div className="flex gap-2">
              <select
                value={toMonth}
                onChange={e => setToMonth(Number(e.target.value))}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i}>{capitalize(m)}</option>
                ))}
              </select>
              <select
                value={toYear}
                onChange={e => setToYear(Number(e.target.value))}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={loading !== null}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {loading === "csv" ? "..." : t("exportCsv")}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={loading !== null}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {loading === "pdf" ? "..." : t("exportPdf")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
