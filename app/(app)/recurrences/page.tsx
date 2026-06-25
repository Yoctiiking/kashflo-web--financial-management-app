"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getRecurrences, deleteRecurrence, toggleRecurrence } from "@/lib/firebase/firestore";
import { processAllRecurrences } from "@/lib/recurrenceEngine";
import { Recurrence } from "@/types";
import AddRecurrenceModal from "@/components/AddRecurrenceModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function RecurrencesPage() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setGroupId(profile.groupId);
      const data = await getRecurrences(profile.groupId);
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
    if (!groupId || !user) return;
    setProcessing(true);
    try {
      const count = await processAllRecurrences(groupId, recurrences, user.uid);
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
    if (!groupId) return;
    try {
      await toggleRecurrence(groupId, recurrence.id, !recurrence.isActive);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (recurrenceId: string) => {
    if (!groupId) return;
    try {
      await deleteRecurrence(groupId, recurrenceId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const frequencyLabel: Record<string, string> = {
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    yearly: "Annuel"
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Récurrences</h2>
          <p className="text-gray-400 mt-1 text-sm">Transactions automatiques</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            {processing ? "Traitement..." : "🔄 Générer"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            + Nouvelle
          </button>
        </div>
      </div>

      {/* Notification de génération */}
      {generated !== null && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm">
            {generated === 0
              ? "✅ Aucune transaction à générer — tout est à jour"
              : `✅ ${generated} transaction${generated > 1 ? "s" : ""} générée${generated > 1 ? "s" : ""}`
            }
          </p>
        </div>
      )}

      {/* Liste */}
      {recurrences.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">Aucune récurrence définie</p>
          <p className="text-gray-600 text-sm">Ajoute tes dépenses et revenus automatiques</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {recurrences.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {/* Toggle actif/inactif */}
                  <button
                    onClick={() => handleToggle(r)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      r.isActive ? "bg-emerald-500" : "bg-gray-700"
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      r.isActive ? "left-5" : "left-1"
                    }`} />
                  </button>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    r.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}>
                    {r.type === "income" ? "💰" : "💸"}
                  </div>

                  <div>
                    <p className={`text-sm font-medium ${r.isActive ? "text-white" : "text-gray-500"}`}>
                      {r.label}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {r.category} · {frequencyLabel[r.frequency]} · prochain {format(r.nextOccurrence, "d MMM", { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className={`font-semibold ${r.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && groupId && (
        <AddRecurrenceModal
          groupId={groupId}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}