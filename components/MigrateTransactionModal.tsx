"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getMonthTransactions, migrateTransactionToSharedBudget } from "@/lib/firebase/firestore";
import { Transaction } from "@/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
    budgetId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

function normalize(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseMonthSearch(search: string): { month: number; year: number | null; remainder: string } | null {
    const normalized = normalize(search);
    for (let i = 0; i < MONTHS_FR.length; i++) {
        const monthNorm = normalize(MONTHS_FR[i]);
        if (normalized === monthNorm) {
            return { month: i, year: null, remainder: "" };
        }
        if (normalized.startsWith(monthNorm + " ")) {
            const rest = normalized.slice(monthNorm.length + 1).trim();
            const yearMatch = rest.match(/^(\d{4})\b/);
            if (yearMatch) {
                return { month: i, year: parseInt(yearMatch[1]), remainder: rest.slice(yearMatch[0].length).trim() };
            }
            return { month: i, year: null, remainder: rest };
        }
    }
    return null;
}

export default function MigrateTransactionModal({ budgetId, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { formatCurrency } = useCurrency();

    const now = new Date();
    const [navYear, setNavYear] = useState(now.getFullYear());
    const [navMonth, setNavMonth] = useState(now.getMonth());

    // Si la recherche détecte un mois, il prend le dessus sur la navigation manuelle
    const parsedSearch = parseMonthSearch(search);
    const targetYear = parsedSearch?.year ?? (parsedSearch ? navYear : navYear);
    const targetMonth = parsedSearch?.month ?? navMonth;
    const effectiveYear = parsedSearch ? (parsedSearch.year ?? navYear) : navYear;

    const goToPreviousMonth = () => {
        setSearch(""); // on quitte le mode recherche par mois pour repasser en navigation manuelle
        if (navMonth === 0) {
            setNavMonth(11);
            setNavYear(y => y - 1);
        } else {
            setNavMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        const isCurrentMonth = navYear === now.getFullYear() && navMonth === now.getMonth();
        if (isCurrentMonth) return;
        setSearch("");
        if (navMonth === 11) {
            setNavMonth(0);
            setNavYear(y => y + 1);
        } else {
            setNavMonth(m => m + 1);
        }
    };

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            try {
                const profile = await getUserProfile(user.uid);
                if (!profile) return;
                setGroupId(profile.groupId);
                const tx = await getMonthTransactions(profile.groupId, effectiveYear, targetMonth);
                setTransactions(tx.filter(t => t.type === "expense"));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, effectiveYear, targetMonth]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDateFilterChange = (value: string) => {
        setDateFilter(value);
        if (value) {
            const [year, month] = value.split("-").map(Number);
            setSearch(""); // on quitte le mode recherche par mois
            setNavYear(year);
            setNavMonth(month - 1);
        }
    };

    const handleMigrateSelected = async () => {
        if (!user || !groupId || selectedIds.size === 0) return;
        const toMigrate = transactions.filter(t => selectedIds.has(t.id));
        if (!confirm(`Déplacer ${toMigrate.length} transaction${toMigrate.length > 1 ? "s" : ""} vers ce budget partagé ? Elles seront retirées de tes transactions personnelles.`)) return;

        setMigrating(true);
        try {
            for (const tx of toMigrate) {
                await migrateTransactionToSharedBudget(
                    groupId,
                    tx.id,
                    budgetId,
                    {
                        amount: tx.amount,
                        label: tx.label,
                        date: tx.date,
                        addedByName: user.displayName || "Utilisateur"
                    },
                    user.uid
                );
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setMigrating(false);
        }
    };

    const effectiveSearch = parsedSearch !== null ? parsedSearch.remainder : search;

    const filtered = transactions.filter(t => {
        const matchesSearch = effectiveSearch === "" ||
            t.label.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
            t.amount.toString().includes(effectiveSearch);

        const matchesDate = dateFilter === "" ||
            format(t.date, "yyyy-MM-dd") === dateFilter;

        return matchesSearch && matchesDate;
    });

    const selectedTotal = transactions
        .filter(t => selectedIds.has(t.id))
        .reduce((sum, t) => sum + t.amount, 0);

    const isCurrentMonthDisplayed = navYear === now.getFullYear() && navMonth === now.getMonth() && !parsedSearch;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h2 className="text-white font-semibold text-lg">Ajouter depuis mes transactions</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Navigation mois */}
                <div className="px-6 pb-3 shrink-0 flex items-center justify-center gap-3">
                    <button
                        onClick={goToPreviousMonth}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Mois précédent"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <p className="text-gray-300 text-sm font-medium capitalize w-32 text-center">
                        {format(new Date(effectiveYear, targetMonth), "MMMM yyyy", { locale: fr })}
                    </p>
                    <button
                        onClick={goToNextMonth}
                        disabled={isCurrentMonthDisplayed}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Mois suivant"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 pb-4 shrink-0 space-y-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border transition-colors ${dateFilter || showDatePicker
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                                }`}
                            aria-label="Filtrer par date"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Nom, montant, ou mois (ex: juin)"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    {showDatePicker && (
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => handleDateFilterChange(e.target.value)}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
                            />
                            {dateFilter && (
                                <button
                                    onClick={() => setDateFilter("")}
                                    className="shrink-0 px-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                    Effacer
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 px-6 pb-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">
                            {search || dateFilter ? "Aucun résultat" : "Aucune dépense ce mois-ci"}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(tx => {
                                const isSelected = selectedIds.has(tx.id);
                                return (
                                    <button
                                        key={tx.id}
                                        onClick={() => toggleSelect(tx.id)}
                                        disabled={migrating}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left border ${isSelected
                                                ? "bg-emerald-500/10 border-emerald-500/40"
                                                : "bg-gray-800 border-transparent hover:bg-gray-700"
                                            } disabled:opacity-50`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-600"
                                            }`}>
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{tx.label}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {tx.category} · {format(tx.date, "d MMM yyyy", { locale: fr })}
                                            </p>
                                        </div>
                                        <p className="text-red-400 font-semibold text-sm shrink-0">{formatCurrency(tx.amount)}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {selectedIds.size > 0 && (
                    <div className="p-6 pt-4 border-t border-gray-800 shrink-0 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}</span>
                            <span className="text-white font-semibold">{formatCurrency(selectedTotal)}</span>
                        </div>
                        <button
                            onClick={handleMigrateSelected}
                            disabled={migrating}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            {migrating ? "Déplacement..." : `Déplacer ${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}