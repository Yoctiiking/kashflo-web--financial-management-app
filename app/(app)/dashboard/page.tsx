"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getMonthTransactions, getRecentTransactions, getBudgets } from "@/lib/firebase/firestore";
import { Transaction, Budget, UserProfile } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DashboardPage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                const userProfile = await getUserProfile(user.uid);
                if (!userProfile) return;

                setProfile(userProfile);

                const [monthTx, recentTx, userBudgets] = await Promise.all([
                    getMonthTransactions(userProfile.groupId),
                    getRecentTransactions(userProfile.groupId),
                    getBudgets(userProfile.groupId)
                ]);

                setTransactions(monthTx);
                setRecentTransactions(recentTx);
                setBudgets(userBudgets);
            } catch (error) {
                console.error("Erreur chargement dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    // Calculs
    const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(amount);

    const currentMonth = format(new Date(), "MMMM yyyy", { locale: fr });

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
                <h2 className="text-2xl font-bold text-white capitalize">{currentMonth}</h2>
                <p className="text-gray-400 mt-1">Bonjour, {user?.displayName} 👋</p>
            </div>

            {/* Cartes de stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
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

            <div className="grid grid-cols-2 gap-6">
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
                            {budgets.map(budget => {
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

                                        // monthly — toutes les transactions du mois déjà chargées
                                        return true;
                                    })
                                    .reduce((sum, t) => sum + t.amount, 0);
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
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}