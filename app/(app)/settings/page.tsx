"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { useLanguage } from "@/lib/providers/LanguageProvider";

const CURRENCY_CODES = ["CAD", "USD", "EUR", "GBP", "CHF", "XOF"];

export default function SettingsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const confirm = useConfirm();
    const { profile } = useUserProfile();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const t = useTranslations("settings");
    const tCurrency = useTranslations("settings.currency.options");
    const [languageSuccess, setLanguageSuccess] = useState(false);
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
            setNameError(t("displayName.errors.empty"));
            return;
        }
        setNameLoading(true);
        setNameError("");
        try {
            await updateDisplayName(displayName.trim());
            setNameSuccess(true);
            setTimeout(() => setNameSuccess(false), 3000);
        } catch (err) {
            setNameError(t("displayName.errors.generic"));
        } finally {
            setNameLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError(t("password.errors.required"));
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError(t("password.errors.tooShort"));
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError(t("password.errors.mismatch"));
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
                setPasswordError(t("password.errors.wrongPassword"));
            } else {
                setPasswordError(t("password.errors.generic"));
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

    const handleUpdateLanguage = (next: "fr" | "en") => {
        setLanguage(next);
        setLanguageSuccess(true);
        setTimeout(() => setLanguageSuccess(false), 3000);
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError(t("dangerZone.errors.passwordRequired"));
            return;
        }

        setDeleteLoading(true);
        setDeleteError("");

        try {
            await deleteAccount(deletePassword);
            router.push("/login");
        } catch (err: any) {
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                setDeleteError(t("dangerZone.errors.wrongPassword"));
            } else {
                setDeleteError(t("dangerZone.errors.generic"));
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleRemovePin = async () => {
        const ok = await confirm({
            title: t("pinLock.confirmDisable.title"),
            message: t("pinLock.confirmDisable.message"),
            confirmLabel: t("pinLock.confirmDisable.confirm"),
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{user?.email}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Nom */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 @container">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("displayName.title")}</h3>
                    <div className="flex flex-col @sm:flex-row gap-2">
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                            placeholder={t("displayName.placeholder")}
                        />
                        <button
                            onClick={handleUpdateName}
                            disabled={nameLoading}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
                        >
                            {nameLoading ? "..." : t("displayName.save")}
                        </button>
                    </div>
                    {nameError && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{nameError}</p>}
                    {nameSuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">✅ {t("displayName.success")}</p>}
                </div>

                {/* Apparence */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("appearance.title")}</h3>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "dark"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            {t("appearance.dark")}
                        </button>
                        <button
                            onClick={() => setTheme("light")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "light"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            {t("appearance.light")}
                        </button>
                    </div>
                </div>

                {/* Verrouillage par code */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("pinLock.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {t("pinLock.description")}
                    </p>
                    {pinActive ? (
                        <button
                            onClick={handleRemovePin}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20"
                        >
                            {t("pinLock.disable")}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowPinSetup(true)}
                            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            {t("pinLock.enable")}
                        </button>
                    )}
                </div>

                {/* Catégories */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("categories.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {t("categories.description")}
                    </p>
                    <button
                        onClick={() => setShowCategories(true)}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {t("categories.manage")}
                    </button>
                </div>

                {/* Mot de passe */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("password.title")}</h3>
                    <div className="space-y-3">
                        <PasswordInput
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder={t("password.currentPlaceholder")}
                        />
                        <PasswordInput
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("password.newPlaceholder")}
                        />
                        <PasswordInput
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("password.confirmPlaceholder")}
                        />
                        {passwordError && <p className="text-red-600 dark:text-red-400 text-sm">{passwordError}</p>}
                        {passwordSuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm">✅ {t("password.success")}</p>}
                        <button
                            onClick={handleUpdatePassword}
                            disabled={passwordLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            {passwordLoading ? t("password.submitting") : t("password.submit")}
                        </button>
                    </div>
                </div>

                {/* Devise */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("currency.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {t("currency.description")}
                    </p>
                    <select
                        value={currency}
                        onChange={(e) => handleUpdateCurrency(e.target.value)}
                        disabled={currencyLoading}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    >
                        {CURRENCY_CODES.map(code => (
                            <option key={code} value={code}>{tCurrency(code)}</option>
                        ))}
                    </select>
                    {currencySuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-3">✅ {t("currency.success")}</p>}
                </div>

                {/* Langue */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("language.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">{t("language.description")}</p>
                    <select
                        value={language}
                        onChange={(e) => handleUpdateLanguage(e.target.value as "fr" | "en")}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="fr">{t("language.options.fr")}</option>
                        <option value="en">{t("language.options.en")}</option>
                    </select>
                    {languageSuccess && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-3">✅ {t("language.success")}</p>}
                </div>

                {/* Contact */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("contact.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">{t("contact.description")}</p>
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {t("contact.button")}
                    </button>
                </div>

                {/* Déconnexion */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t("session.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">{t("session.connectedAs", { email: user?.email || "" })}</p>
                    <button
                        onClick={() => logoutUser().then(() => router.push("/login"))}
                        className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {t("session.logout")}
                    </button>
                </div>

                {/* Zone danger — pleine largeur */}
                <div className="bg-white dark:bg-gray-900 border border-red-500/20 rounded-2xl p-6 lg:col-span-2 text-center">
                    <h3 className="text-red-600 dark:text-red-400 font-semibold mb-1">{t("dangerZone.title")}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {t("dangerZone.description")}
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium px-6 py-3 rounded-xl transition-colors border border-red-500/20"
                        >
                            {t("dangerZone.deleteButton")}
                        </button>
                    ) : (
                        <div className="max-w-md space-y-3">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {t("dangerZone.confirmPrompt")}
                            </p>
                            <PasswordInput
                                variant="danger"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder={t("dangerZone.passwordPlaceholder")}
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
                                    {t("dangerZone.cancel")}
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading}
                                    className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                                >
                                    {deleteLoading ? t("dangerZone.deleting") : t("dangerZone.confirm")}
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