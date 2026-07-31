"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useTranslations } from "next-intl";
import { getRecurrences, deleteRecurrence, toggleRecurrence } from "@/lib/firebase/firestore";
import { processAllRecurrences } from "@/lib/recurrenceEngine";
import { Recurrence } from "@/types";
import AddRecurrenceModal from "@/components/AddRecurrenceModal";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/utils/months";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { useCurrency } from "@/lib/hooks/useCurrency";
import CurrencyValue from "@/components/CurrencyValue";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, X } from "lucide-react";

export default function RecurrencesPage() {
  const { user } = useAuth();
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);
  const confirm = useConfirm();
  const t = useTranslations("recurrences");
  const tFrequency = useTranslations("common.frequency");
  const { language } = useLanguage();
  const dateLocale = getDateFnsLocale(language);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getRecurrences(user.uid);
      setRecurrences(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProcess = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const count = await processAllRecurrences(user.uid, recurrences, user.uid);
      setGenerated(count);
      await loadData();
      setTimeout(() => setGenerated(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggle = async (recurrence: Recurrence) => {
    if (!user) return;
    try {
      await toggleRecurrence(user.uid, recurrence.id, !recurrence.isActive);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (recurrenceId: string) => {
    if (!user) return;
    const ok = await confirm({
    title: t("deleteConfirm.title"),
    message: t("deleteConfirm.message"),
    confirmLabel: t("deleteConfirm.confirm"),
    danger: true
  });
  if (!ok) return;
    try {
      await deleteRecurrence(user.uid, recurrenceId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getFrequencyLabel = (r: Recurrence): string => {
    switch (r.frequency) {
      case "daily": return tFrequency("daily");
      case "weekly": return tFrequency("weekly");
      case "monthly": return tFrequency("monthly");
      case "yearly": return tFrequency("yearly");
      case "custom": return t("everyXDays", { days: r.customDays ?? "?" });
      default: return r.frequency;
    }
  };

  const { displayAmount, ready } = useCurrency();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white font-medium px-3 sm:px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? "animate-spin" : ""}`} strokeWidth={2} />
            {t("generate")}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            {t("new")}
          </button>
        </div>
      </div>

      {/* Notification de génération */}
      {generated !== null && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-600 dark:text-emerald-400 text-sm">
            {generated === 0
              ? t("generatedNone")
              : t("generatedCount", { count: generated })
            }
          </p>
        </div>
      )}

      {/* Liste */}
      {recurrences.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">{t("emptyTitle")}</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {recurrences.map(r => (
              <div key={r.id} className="p-4 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(r)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${r.isActive ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${r.isActive ? "left-5" : "left-1"}`} />
                  </button>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {r.type === "income"
                      ? <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                      : <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
                    }
                  </div>

                  <p className={`flex-1 text-sm font-medium truncate min-w-0 ${r.isActive ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                    {r.label}
                  </p>

                  <CurrencyValue
                    amount={r.amount}
                    ready={ready}
                    formatCurrency={(amt) => displayAmount(amt, r.originalAmount, r.originalCurrency)}
                    prefix={r.type === "income" ? "+" : "-"}
                    className={`font-semibold text-sm shrink-0 ${r.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  />
                </div>

                <div className="flex items-center justify-between mt-1.5 pl-[6.5rem]">
                  <p className="text-gray-500 text-xs truncate mr-2">
                    {r.category} · {getFrequencyLabel(r)} · {t("nextLabel")} {format(r.nextOccurrence, "d MMM", { locale: dateLocale })}
                  </p>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white text-2xl font-light rounded-full shadow-lg shadow-emerald-500/30 transition-colors z-40 flex items-center justify-center"
      >
        +
      </button>

      {user && showModal && (
        <AddRecurrenceModal
          groupId={user.uid}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}