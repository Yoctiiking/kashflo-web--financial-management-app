"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getLastMonthsTransactions } from "@/lib/firebase/firestore";
import { Transaction } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Couleurs pour le camembert
const PIE_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function StatsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      const tx = await getLastMonthsTransactions(profile.groupId, 6);
      setTransactions(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Données pour le BarChart — dépenses et revenus par mois
  const barData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = format(date, "MMM", { locale: fr });
    const year = date.getFullYear();
    const monthNum = date.getMonth();

    const monthTx = transactions.filter(t =>
      t.date.getMonth() === monthNum &&
      t.date.getFullYear() === year
    );

    const expenses = monthTx
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const income = monthTx
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    return { month, expenses, income };
  });

  // Données pour le PieChart — dépenses par catégorie ce mois
  const now = new Date();
  const monthExpenses = transactions.filter(t =>
    t.type === "expense" &&
    t.date.getMonth() === now.getMonth() &&
    t.date.getFullYear() === now.getFullYear()
  );

  const pieData = Object.entries(
    monthExpenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(amount);

  // Tooltip personnalisé pour le BarChart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm">
        <p className="text-gray-400 mb-2 font-medium capitalize">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.fill }}>
            {entry.name === "income" ? "Revenus" : "Dépenses"} : {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  // Tooltip personnalisé pour le PieChart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm">
        <p className="text-white font-medium">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  };

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Statistiques</h2>
        <p className="text-gray-400 mt-1 text-sm">Les 6 derniers mois</p>
      </div>

      <div className="space-y-6">
        {/* BarChart — évolution mensuelle */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6">Revenus vs Dépenses</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}$`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#ffffff08" }} />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PieChart — dépenses par catégorie */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6">
            Dépenses par catégorie — {format(new Date(), "MMMM yyyy", { locale: fr })}
          </h3>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucune dépense ce mois-ci</p>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Légende manuelle */}
              <div className="flex-1 space-y-3">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-300 text-sm">{entry.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}