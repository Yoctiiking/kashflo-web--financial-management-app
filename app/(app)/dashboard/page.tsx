"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getMonthTransactions, getBudgets, getRecurrences, updateOnboardingVersion } from "@/lib/firebase/firestore";
import { Transaction, Budget, Recurrence } from "@/types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { getMonthNames } from "@/lib/utils/months";
import CurrencyValue from "@/components/CurrencyValue";
import OnboardingCarousel from "@/components/OnboardingCarousel";
import { ONBOARDING_SLIDES, ONBOARDING_VERSION } from "@/lib/onboardingSlides";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";

const PIE_COLORS = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function DashboardPage() {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const { language } = useLanguage();
    const dateLocale = language === "en" ? enUS : fr;
    const t = useTranslations("dashboard");
    const now0 = new Date();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
    const [loading, setLoading] = useState(true);
    const [onboardingSlides, setOnboardingSlides] = useState<typeof ONBOARDING_SLIDES>([]);
    const [currentYear, setCurrentYear] = useState(now0.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(now0.getMonth());
    const [pickerYear, setPickerYear] = useState(currentYear);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const monthNames = getMonthNames(language);

    useEffect(() => {
        if (!user) return;

        const loadStaticData = async () => {
            try {
                const userProfile = await getUserProfile(user.uid);
                if (!userProfile) return;

                const userVersion = userProfile.onboardingVersion ?? 0;
                if (userVersion < ONBOARDING_VERSION) {
                    const newSlides = ONBOARDING_SLIDES.filter(s => s.version > userVersion);
                    if (newSlides.length > 0) {
                        setOnboardingSlides(newSlides);
                    }
                }

                const [userBudgets, userRecurrences] = await Promise.all([
                    getBudgets(user.uid),
                    getRecurrences(user.uid)
                ]);

                setBudgets(userBudgets);
                setRecurrences(userRecurrences);
            } catch (error) {
                console.error("Erreur chargement dashboard:", error);
            }
        };

        loadStaticData();
    }, [user]);

    const loadTransactions = useCallback(async () => {
        if (!user) return;
        try {
            const monthTx = await getMonthTransactions(user.uid, currentYear, currentMonth);
            setTransactions(monthTx);
        } catch (error) {
            console.error("Erreur chargement transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [user, currentYear, currentMonth]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const openMonthPicker = () => {
        setPickerYear(currentYear);
        setShowMonthPicker(true);
    };

    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(y => y - 1);
        } else {
            setCurrentMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        const isCurrentMonth = currentYear === now0.getFullYear() && currentMonth === now0.getMonth();
        if (isCurrentMonth) return;
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(y => y + 1);
        } else {
            setCurrentMonth(m => m + 1);
        }
    };

    const handleOnboardingComplete = async () => {
        setOnboardingSlides([]);
        if (user) {
            try {
                await updateOnboardingVersion(user.uid, ONBOARDING_VERSION);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const { formatCurrency, displayAmount, ready } = useCurrency();

    const currentMonthLabel = format(new Date(currentYear, currentMonth), "MMMM yyyy", { locale: dateLocale });

    const recentTransactions = [...transactions]
        .sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

    const now = new Date();
    // Transactions du mois affiché générées par une récurrence — reflète ce qui a
    // réellement eu lieu pendant le mois consulté (transactions déjà période-scopées),
    // plutôt que recurrence.nextOccurrence qui ne suit que le mois réel actuel.
    const recurringTransactions = transactions
        .filter(t => t.recurrenceId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

    const upcomingRecurrences = recurrences.filter(r => {
        if (!r.isActive) return false;
        const diffMs = r.nextOccurrence.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
    }).sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());

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
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-sm">
                <p className="text-gray-900 dark:text-white font-medium">{payload[0].name}</p>
                <p style={{ color: payload[0].payload.fill }}>
                    <CurrencyValue amount={payload[0].value} ready={ready} formatCurrency={formatCurrency} />
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
            {onboardingSlides.length > 0 && (
                <OnboardingCarousel slides={onboardingSlides} onComplete={handleOnboardingComplete} />
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 relative">
                    <button
                        onClick={goToPreviousMonth}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        aria-label={t("prevMonth")}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <button
                        onClick={openMonthPicker}
                        className="text-2xl font-bold text-gray-900 dark:text-white capitalize hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                        {currentMonthLabel}
                    </button>

                    <button
                        onClick={goToNextMonth}
                        disabled={currentYear === now0.getFullYear() && currentMonth === now0.getMonth()}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label={t("nextMonth")}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>

                    {showMonthPicker && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMonthPicker(false)}
                            />

                            <div className="absolute top-full left-0 mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-4 z-20 w-64">
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => setPickerYear(y => y - 1)}
                                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>
                                    <span className="text-gray-900 dark:text-white text-sm font-medium">{pickerYear}</span>
                                    <button
                                        onClick={() => setPickerYear(y => y + 1)}
                                        disabled={pickerYear >= now0.getFullYear()}
                                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {monthNames.map((m, i) => {
                                        const isFuture = pickerYear === now0.getFullYear() && i > now0.getMonth();
                                        const isSelected = pickerYear === currentYear && i === currentMonth;
                                        return (
                                            <button
                                                key={m}
                                                disabled={isFuture}
                                                onClick={() => {
                                                    setCurrentMonth(i);
                                                    setCurrentYear(pickerYear);
                                                    setShowMonthPicker(false);
                                                }}
                                                className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isSelected
                                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    }`}
                                            >
                                                {m.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{t("greeting", { name: profile?.displayName || user?.displayName || "" })}</p>
            </div>

            {/* Notification récurrences à venir */}
            {upcomingRecurrences.length > 0 && (
                <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2} />
                        <div className="flex-1 min-w-0">
                            <p className="text-amber-600 dark:text-amber-400 font-medium text-sm mb-2">
                                {t("upcomingPayments", { count: upcomingRecurrences.length })}
                            </p>
                            <div className="space-y-1.5">
                                {upcomingRecurrences.map(r => {
                                    const diffDays = Math.ceil((r.nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const dayLabel = diffDays === 0 ? t("dayLabel.today") : diffDays === 1 ? t("dayLabel.tomorrow") : t("dayLabel.inDays", { days: diffDays });
                                    return (
                                        <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="text-gray-700 dark:text-gray-300 truncate min-w-0">{r.label} · {dayLabel}</span>
                                            <CurrencyValue
                                                amount={r.amount}
                                                ready={ready}
                                                formatCurrency={(amt) => displayAmount(amt, r.originalAmount, r.originalCurrency)}
                                                prefix={r.type === "income" ? "+" : "-"}
                                                className={`shrink-0 ${r.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                                            />
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
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 min-w-0">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{t("stats.balance")}</p>
                    <CurrencyValue
                        amount={balance}
                        ready={ready}
                        formatCurrency={formatCurrency}
                        className={`text-2xl font-bold truncate ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 min-w-0">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{t("stats.income")}</p>
                    <CurrencyValue amount={totalIncome} ready={ready} formatCurrency={formatCurrency} className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate" />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 min-w-0">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{t("stats.expenses")}</p>
                    <CurrencyValue amount={totalExpenses} ready={ready} formatCurrency={formatCurrency} className="text-2xl font-bold text-red-600 dark:text-red-400 truncate" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transactions récentes */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("recentTransactions.title")}</h3>
                    {recentTransactions.length === 0 ? (
                        <p className="text-gray-500 text-sm">{t("recentTransactions.empty")}</p>
                    ) : (
                        <div className="space-y-3">
                            {recentTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{tx.label}</p>
                                        <p className="text-gray-500 text-xs truncate">{tx.category}</p>
                                    </div>
                                    <CurrencyValue
                                        amount={tx.amount}
                                        ready={ready}
                                        formatCurrency={(amt) => displayAmount(amt, tx.originalAmount, tx.originalCurrency)}
                                        prefix={tx.type === "income" ? "+" : "-"}
                                        className={`font-semibold text-sm shrink-0 ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <Link
                        href={`/transactions?year=${currentYear}&month=${currentMonth}`}
                        className="block w-full mt-4 text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                        {t("seeMore")}
                    </Link>
                </div>

                {/* Budgets */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("budgets.title")}</h3>
                    {budgets.length === 0 ? (
                        <p className="text-gray-500 text-sm">{t("budgets.empty")}</p>
                    ) : (
                        <div className="space-y-4">
                            {budgets
                                .map(budget => {
                                    // Somme sur tout le mois affiché pour tous les types de période (journalier/
                                    // hebdomadaire inclus) — "aujourd'hui"/"cette semaine" réels n'ont pas de sens
                                    // une fois qu'on peut naviguer vers un mois passé. Comportement volontairement
                                    // différent de lib/utils/budgetUtils.ts (pages Budgets, sans navigation de période).
                                    const spent = transactions
                                        .filter(t => t.type === "expense" && t.category === budget.category)
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
                                            <div className="flex justify-between items-baseline gap-2 text-sm mb-1.5">
                                                <div className="min-w-0 truncate">
                                                    <span className="text-gray-700 dark:text-gray-300">{budget.category}</span>
                                                    <span className="text-gray-400 dark:text-gray-600 text-xs ml-2">
                                                        {budget.period === "daily" ? t("budgets.perDay") : budget.period === "weekly" ? t("budgets.perWeek") : t("budgets.perMonth")}
                                                    </span>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 shrink-0 ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                                                    <CurrencyValue amount={spent} ready={ready} formatCurrency={formatCurrency} />
                                                    <span>/</span>
                                                    <CurrencyValue amount={budget.limit} ready={ready} formatCurrency={(amt) => displayAmount(amt, budget.originalAmount, budget.originalCurrency)} />
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
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
                    <Link
                        href={`/budgets?year=${currentYear}&month=${currentMonth}`}
                        className="block w-full mt-4 text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                        {t("seeMore")}
                    </Link>
                </div>

                {/* Récurrences du mois */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("monthRecurrences.title")}</h3>
                    {recurringTransactions.length === 0 ? (
                        <p className="text-gray-500 text-sm">{t("monthRecurrences.empty")}</p>
                    ) : (
                        <div className="space-y-3">
                            {recurringTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                                            }`}>
                                            {tx.type === "income"
                                                ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                                                : <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2} />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{tx.label}</p>
                                            <p className="text-gray-500 text-xs">
                                                {format(tx.date, "d MMM", { locale: dateLocale })}
                                            </p>
                                        </div>
                                    </div>
                                    <CurrencyValue
                                        amount={tx.amount}
                                        ready={ready}
                                        formatCurrency={(amt) => displayAmount(amt, tx.originalAmount, tx.originalCurrency)}
                                        prefix={tx.type === "income" ? "+" : "-"}
                                        className={`font-semibold text-sm shrink-0 ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <Link
                        href={`/transactions?year=${currentYear}&month=${currentMonth}&recurring=1`}
                        className="block w-full mt-4 text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                        {t("seeMore")}
                    </Link>
                </div>

                {/* Pie chart */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("expensesByCategory.title")}</h3>
                    {pieData.length === 0 ? (
                        <p className="text-gray-500 text-sm">{t("expensesByCategory.empty")}</p>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="w-1/2 max-w-[200px] h-[200px]">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 200, height: 200 }}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="55%"
                                            outerRadius="90%"
                                            paddingAngle={3}
                                            dataKey="value"
                                            isAnimationActive={false}
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
                            </div>
                            <div className="flex-1 space-y-2">
                                {pieData.slice(0, 5).map((entry, index) => (
                                    <div key={entry.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                            />
                                            <span className="text-gray-700 dark:text-gray-300 text-xs truncate">{entry.name}</span>
                                        </div>
                                        <CurrencyValue
                                            amount={entry.value}
                                            ready={ready}
                                            formatCurrency={formatCurrency}
                                            className="text-gray-600 dark:text-gray-400 text-xs shrink-0 self-end sm:self-auto sm:ml-2"
                                        />
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