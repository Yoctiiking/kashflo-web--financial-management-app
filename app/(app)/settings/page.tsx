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
import { getGroup, updateGroupCurrency } from "@/lib/firebase/firestore";
import { getUserProfile } from "@/lib/firebase/firestore";
import { useEffect } from "react";
import FeedbackModal from "@/components/FeedbackModal";

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

    // Nom
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [nameLoading, setNameLoading] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);
    const [nameError, setNameError] = useState("");

    // Mot de passe
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // Devise
    const [groupId, setGroupId] = useState<string | null>(null);
    const [currency, setCurrency] = useState("CAD");
    const [currencyLoading, setCurrencyLoading] = useState(false);
    const [currencySuccess, setCurrencySuccess] = useState(false);

    //Feedback
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);
    const [feedbackError, setFeedbackError] = useState("");
    const [showFeedback, setShowFeedback] = useState(false);


    // Suppression
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const profile = await getUserProfile(user.uid);
            if (!profile) return;
            setGroupId(profile.groupId);

            const group = await getGroup(profile.groupId);
            if (!group) return;
            setCurrency(group.currency);
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
        if (!groupId) return;
        setCurrencyLoading(true);
        try {
            await updateGroupCurrency(groupId, newCurrency);
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
        if (!groupId) return;

        setDeleteLoading(true);
        setDeleteError("");

        try {
            await deleteAccount(deletePassword, groupId);
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

    return (
        <div className="p-4 sm:p-8 max-w-2xl space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Paramètres</h2>
                <p className="text-gray-400 mt-1 text-sm">{user?.email}</p>
            </div>

            {/* Nom */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Nom d'affichage</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Ton prénom"
                    />
                    <button
                        onClick={handleUpdateName}
                        disabled={nameLoading}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
                    >
                        {nameLoading ? "..." : "Sauvegarder"}
                    </button>
                </div>
                {nameError && <p className="text-red-400 text-sm mt-2">{nameError}</p>}
                {nameSuccess && <p className="text-emerald-400 text-sm mt-2">✅ Nom mis à jour</p>}
            </div>

            {/* Mot de passe */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Mot de passe</h3>
                <div className="space-y-3">
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Mot de passe actuel"
                    />
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Nouveau mot de passe"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Confirmer le nouveau mot de passe"
                    />
                    {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                    {passwordSuccess && <p className="text-emerald-400 text-sm">✅ Mot de passe mis à jour</p>}
                    <button
                        onClick={handleUpdatePassword}
                        disabled={passwordLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {passwordLoading ? "Mise à jour..." : "Changer le mot de passe"}
                    </button>
                </div>
            </div>

            {/* Devise */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Devise</h3>
                <p className="text-gray-500 text-sm mb-4">
                    Choisissez la devise dans laquelle vous saisissez vos montants. La conversion automatique entre devises sera disponible dans une prochaine version.
                </p>
                <div className="space-y-2">
                    {CURRENCIES.map(c => (
                        <button
                            key={c.code}
                            onClick={() => handleUpdateCurrency(c.code)}
                            disabled={currencyLoading}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${currency === c.code
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                                }`}
                        >
                            <span className="text-sm">{c.label}</span>
                            {currency === c.code && <span className="text-xs">✓</span>}
                        </button>
                    ))}
                </div>
                {currencySuccess && <p className="text-emerald-400 text-sm mt-3">✅ Devise mise à jour</p>}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Nous contacter</h3>
                <p className="text-gray-500 text-sm mb-4">Une question, un bug, ou une suggestion ?</p>
                <button
                    onClick={() => setShowFeedback(true)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                    ✉️ Envoyer un message
                </button>
            </div>

            {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

            {/* Déconnexion */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Session</h3>
                <p className="text-gray-500 text-sm mb-4">Connecté en tant que {user?.email}</p>
                <button
                    onClick={() => logoutUser().then(() => router.push("/login"))}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                    🚪 Se déconnecter
                </button>
            </div>

            {/* Zone danger */}
            <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-red-400 font-semibold mb-1">Zone dangereuse</h3>
                <p className="text-gray-500 text-sm mb-4">
                    La suppression de ton compte est irréversible. Toutes tes données seront perdues.
                </p>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20"
                    >
                        Supprimer mon compte
                    </button>
                ) : (
                    <div className="space-y-3">
                        <p className="text-gray-300 text-sm">
                            Entre ton mot de passe pour confirmer la suppression :
                        </p>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="w-full bg-gray-800 border border-red-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="Ton mot de passe"
                        />
                        {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                    setDeleteError("");
                                }}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                {deleteLoading ? "Suppression..." : "Confirmer"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}