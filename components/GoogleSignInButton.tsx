"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { loginWithGoogle } from "@/lib/firebase/auth";

interface GoogleSignInButtonProps {
    onSuccess: () => void;
    onError: (code: string) => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false);
    const t = useTranslations("auth.common");

    const handleClick = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            onSuccess();
        } catch (err: any) {
            // Le code Firebase seul ne dit pas toujours grand-chose (ex. "auth/internal-error"
            // peut cacher un provider Google désactivé côté console) — le message complet en
            // console aide à diagnostiquer sans devoir reproduire l'erreur.
            console.error("Erreur de connexion Google :", err);
            onError(err.code ?? "unknown");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
        >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.61z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            {loading ? t("connecting") : t("continueWithGoogle")}
        </button>
    );
}
