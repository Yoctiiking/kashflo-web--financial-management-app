"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getMonthTransactions, getRecentTransactions, getBudgets, getRecurrences } from "@/lib/firebase/firestore";
import { Transaction, Budget, Recurrence } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/lib/hooks/useCurrency";

const PIE_COLORS = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                const userProfile = await getUserProfile(user.uid);
                if (!userProfile) return;

                const [monthTx, recentTx, userBudgets, userRecurrences] = await Promise.all([
                    getMonthTransactions(userProfile.groupId),
                    getRecentTransactions(userProfile.groupId),
                    getBudgets(userProfile.groupId),
                    getRecurrences(userProfile.groupId)
                ]);

                setTransactions(monthTx);
                setRecentTransactions(recentTx);
                setBudgets(userBudgets);
                setRecurrences(userRecurrences);
            } catch (error) {
                console.error("Erreur chargement dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const { formatCurrency } = useCurrency();

    const currentMonth = format(new Date(), "MMMM yyyy", { locale: fr });

    // Récurrences du mois en cours
    const now = new Date();
    const monthRecurrences = recurrences.filter(r => {
        return r.isActive &&
            r.nextOccurrence.getMonth() === now.getMonth() &&
            r.nextOccurrence.getFullYear() === now.getFullYear();
    });

    // Récurrences à venir dans les 3 prochains jours
    const upcomingRecurrences = recurrences.filter(r => {
        if (!r.isActive) return false;
        const diffMs = r.nextOccurrence.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
    }).sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());

    // Pie chart — dépenses par catégorie ce mois
    const monthExpenses = transactions.filter(t => t.type === "expense");
    const pieData = Object.entries(
        monthExpenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>)
    )
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

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
        <div className="p-4 sm:p-8">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white capitalize">{currentMonth}</h2>
                <p className="text-gray-400 mt-1">Bonjour, {user?.displayName} 👋</p>
            </div>

            {/* Notification récurrences à venir */}
            {upcomingRecurrences.length > 0 && (
                <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">⏰</span>
                        <div className="flex-1">
                            <p className="text-amber-400 font-medium text-sm mb-2">
                                {upcomingRecurrences.length} paiement{upcomingRecurrences.length > 1 ? "s" : ""} à venir
                            </p>
                            <div className="space-y-1.5">
                                {upcomingRecurrences.map(r => {
                                    const diffDays = Math.ceil((r.nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const dayLabel = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Demain" : `Dans ${diffDays} jours`;
                                    return (
                                        <div key={r.id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-300">{r.label} · {dayLabel}</span>
                                            <span className={r.type === "income" ? "text-emerald-400" : "text-red-400"}>
                                                {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cartes de stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Solde</p>
                    <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(balance)}
                    </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Revenus</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Dépenses</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transactions récentes */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4">Transactions récentes</h3>
                    {recentTransactions.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune transaction pour l'instant</p>
                    ) : (
                        <div className="space-y-3">
                            {recentTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{tx.label}</p>
                                        <p className="text-gray-500 text-xs">{tx.category}</p>
                                    </div>
                                    <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Budgets */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4">Budgets</h3>
                    {budgets.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucun budget défini</p>
                    ) : (
                        <div className="space-y-4">
                            {budgets
                                .map(budget => {
                                    const spent = transactions
                                        .filter(t => {
                                            if (t.type !== "expense" || t.category !== budget.category) return false;
                                            if (budget.period === "daily") {
                                                const today = new Date();
                                                return (
                                                    t.date.getDate() === today.getDate() &&
                                                    t.date.getMonth() === today.getMonth() &&
                                                    t.date.getFullYear() === today.getFullYear()
                                                );
                                            }
                                            if (budget.period === "weekly") {
                                                const now = new Date();
                                                const startOfWeek = new Date(now);
                                                startOfWeek.setDate(now.getDate() - now.getDay());
                                                startOfWeek.setHours(0, 0, 0, 0);
                                                return t.date >= startOfWeek;
                                            }
                                            return true;
                                        })
                                        .reduce((sum, t) => sum + t.amount, 0);
                                    return { ...budget, spent };
                                })
                                .sort((a, b) => b.spent - a.spent)
                                .slice(0, 5)
                                .map(budget => {
                                    const spent = budget.spent;
                                    const percentage = Math.min((spent / budget.limit) * 100, 100);
                                    const isOver = spent > budget.limit;
                                    return (
                                        <div key={budget.id}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <div>
                                                    <span className="text-gray-300">{budget.category}</span>
                                                    <span className="text-gray-600 text-xs ml-2">
                                                        {budget.period === "daily" ? "/ jour" : budget.period === "weekly" ? "/ semaine" : "/ mois"}
                                                    </span>
                                                </div>
                                                <span className={isOver ? "text-red-400" : "text-gray-400"}>
                                                    {formatCurrency(spent)} / {formatCurrency(budget.limit)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    )}
                </div>

                {/* Récurrences du mois */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4">Récurrences ce mois</h3>
                    {monthRecurrences.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune récurrence prévue ce mois</p>
                    ) : (
                        <div className="space-y-3">
                            {monthRecurrences.map(r => (
                                <div key={r.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${r.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                                            }`}>
                                            {r.type === "income" ? "💰" : "💸"}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{r.label}</p>
                                            <p className="text-gray-500 text-xs">
                                                {format(r.nextOccurrence, "d MMM", { locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-semibold text-sm ${r.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                        {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pie chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4">Dépenses par catégorie</h3>
                    {pieData.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune dépense ce mois-ci</p>
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
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
                            <div className="flex-1 space-y-2">
                                {pieData.slice(0, 5).map((entry, index) => (
                                    <div key={entry.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                            />
                                            <span className="text-gray-300 text-xs truncate">{entry.name}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs shrink-0 ml-2">{formatCurrency(entry.value)}</span>
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