"use client";

import { useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter } from "next/navigation";
import {
    updateDisplayName,
    updateUserPassword,
    deleteAccount,
    logoutUser
} from "@/lib/firebase/auth";
import { getUserProfile, updateUserCurrency } from "@/lib/firebase/firestore";
import { useEffect } from "react";
import FeedbackModal from "@/components/FeedbackModal";
import PasswordInput from "@/components/PasswordInput";
import CategoriesModal from "@/components/CategoriesModal";
import { hasPinSet, removePin } from "@/lib/pinLock";
import PinSetupModal from "@/components/PinSetupModal";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import { useTheme } from "@/lib/providers/ThemeProvider";

const CURRENCIES = [
    { code: "CAD", label: "Dollar canadien (CAD)" },
    { code: "USD", label: "Dollar américain (USD)" },
    { code: "EUR", label: "Euro (EUR)" },
    { code: "GBP", label: "Livre sterling (GBP)" },
    { code: "CHF", label: "Franc suisse (CHF)" },
    { code: "XOF", label: "Franc CFA (XOF)" },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const confirm = useConfirm();
    const { profile } = useUserProfile();
    const { theme, setTheme } = useTheme();
    const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || "");
    const [nameLoading, setNameLoading] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);
    const [nameError, setNameError] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    const [currency, setCurrency] = useState("CAD");
    const [currencyLoading, setCurrencyLoading] = useState(false);
    const [currencySuccess, setCurrencySuccess] = useState(false);

    const [showFeedback, setShowFeedback] = useState(false);

    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pinActive, setPinActive] = useState(false);

    const [showCategories, setShowCategories] = useState(false);

    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        setPinActive(hasPinSet());
    }, []);

    // Garde le champ synchronisé si le nom change depuis un autre appareil pendant que la page est ouverte
    useEffect(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
    }, [profile?.displayName]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const profile = await getUserProfile(user.uid);
            if (!profile) return;
            setCurrency(profile.currency);
        };
        load();
    }, [user]);

    const handleUpdateName = async () => {
        if (!displayName.trim()) {
            setNameError("Le nom ne peut pas être vide");
            return;
        }
        setNameLoading(true);
        setNameError("");
        try {
            await updateDisplayName(displayName.trim());
            setNameSuccess(true);
            setTimeout(() => setNameSuccess(false), 3000);
        } catch (err) {
            setNameError("Erreur lors de la mise à jour");
        } finally {
            setNameLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Tous les champs sont obligatoires");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Les mots de passe ne correspondent pas");
            return;
        }

        setPasswordLoading(true);
        setPasswordError("");

        try {
            await updateUserPassword(currentPassword, newPassword);
            setPasswordSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err: any) {
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                setPasswordError("Mot de passe actuel incorrect");
            } else {
                setPasswordError("Erreur lors de la mise à jour");
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleUpdateCurrency = async (newCurrency: string) => {
        if (!user) return;
        setCurrencyLoading(true);
        try {
            await updateUserCurrency(user.uid, newCurrency);
            setCurrency(newCurrency);
            setCurrencySuccess(true);
            setTimeout(() => setCurrencySuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setCurrencyLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError("Entre ton mot de passe pour confirmer");
            return;
        }

        setDeleteLoading(true);
        setDeleteError("");

        try {
            await deleteAccount(deletePassword);
            router.push("/login");
        } catch (err: any) {
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                setDeleteError("Mot de passe incorrect");
            } else {
                setDeleteError("Erreur lors de la suppression");
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleRemovePin = async () => {
        const ok = await confirm({
            title: "Désactiver le verrouillage par code ?",
            message: "L'application ne sera plus protégée par un code après une période d'inactivité.",
            confirmLabel: "Désactiver",
            danger: true
        });
        if (!ok) return;
        removePin();
        setPinActive(false);
    };

    return (
        <div className="p-4 sm:p-8 max-w-5xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{user?.email}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Nom */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 @container">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Nom d'affichage</h3>
                    <div className="flex flex-col @sm:flex-row gap-2">
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                            placeholder="Ton prénom"
                        />
                        <button
                            onClick={handleUpdateName}
                            disabled={nameLoading}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
                        >
                            {nameLoading ? "..." : "Sauvegarder"}
                        </button>
                    </div>
                    {nameError && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{nameError}</p>}
                    {nameSuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">✅ Nom mis à jour</p>}
                </div>

                {/* Apparence */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Apparence</h3>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "dark"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            🌙 Sombre
                        </button>
                        <button
                            onClick={() => setTheme("light")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "light"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            ☀️ Clair
                        </button>
                    </div>
                </div>

                {/* Verrouillage par code */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Verrouillage par code</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Protège l'accès à l'app après 5 minutes d'inactivité
                    </p>
                    {pinActive ? (
                        <button
                            onClick={handleRemovePin}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20"
                        >
                            Désactiver le code
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowPinSetup(true)}
                            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            Activer un code de verrouillage
                        </button>
                    )}
                </div>

                {/* Catégories */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Catégories</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Ajoute, renomme ou supprime tes catégories de dépenses et revenus
                    </p>
                    <button
                        onClick={() => setShowCategories(true)}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Gérer les catégories
                    </button>
                </div>

                {/* Mot de passe */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Mot de passe</h3>
                    <div className="space-y-3">
                        <PasswordInput
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Mot de passe actuel"
                        />
                        <PasswordInput
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                        />
                        <PasswordInput
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmer le nouveau mot de passe"
                        />
                        {passwordError && <p className="text-red-600 dark:text-red-400 text-sm">{passwordError}</p>}
                        {passwordSuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm">✅ Mot de passe mis à jour</p>}
                        <button
                            onClick={handleUpdatePassword}
                            disabled={passwordLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            {passwordLoading ? "Mise à jour..." : "Changer le mot de passe"}
                        </button>
                    </div>
                </div>

                {/* Devise */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Devise</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Choisis la devise dans laquelle tes montants s'affichent. La conversion est automatique et basée sur les taux du jour.
                    </p>
                    <select
                        value={currency}
                        onChange={(e) => handleUpdateCurrency(e.target.value)}
                        disabled={currencyLoading}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    >
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                    </select>
                    {currencySuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-3">✅ Devise mise à jour</p>}
                </div>

                {/* Contact */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Nous contacter</h3>
                    <p className="text-gray-500 text-sm mb-4">Une question, un bug, ou une suggestion ?</p>
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        ✉️ Envoyer un message
                    </button>
                </div>

                {/* Déconnexion */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Session</h3>
                    <p className="text-gray-500 text-sm mb-4">Connecté en tant que {user?.email}</p>
                    <button
                        onClick={() => logoutUser().then(() => router.push("/login"))}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        🚪 Se déconnecter
                    </button>
                </div>

                {/* Zone danger — pleine largeur */}
                <div className="bg-white dark:bg-gray-900 border border-red-500/20 rounded-2xl p-6 lg:col-span-2 text-center">
                    <h3 className="text-red-600 dark:text-red-400 font-semibold mb-1">Zone dangereuse</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        La suppression de ton compte est irréversible. Toutes tes données seront perdues.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium px-6 py-3 rounded-xl transition-colors border border-red-500/20"
                        >
                            Supprimer mon compte
                        </button>
                    ) : (
                        <div className="max-w-md space-y-3">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                Entre ton mot de passe pour confirmer la suppression :
                            </p>
                            <PasswordInput
                                variant="danger"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Ton mot de passe"
                            />
                            {deleteError && <p className="text-red-600 dark:text-red-400 text-sm">{deleteError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword("");
                                        setDeleteError("");
                                    }}
                                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading}
                                    className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                                >
                                    {deleteLoading ? "Suppression..." : "Confirmer"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showPinSetup && (
                <PinSetupModal
                    onClose={() => setShowPinSetup(false)}
                    onSuccess={() => setPinActive(true)}
                />
            )}

            {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

            {showCategories && <CategoriesModal onClose={() => setShowCategories(false)} />}
        </div>
    );
}