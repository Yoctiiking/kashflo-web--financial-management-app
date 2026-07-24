"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { resendVerificationEmail, logoutUser } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth.verifyEmail");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Vérifie automatiquement toutes les 3 secondes si l'email a été confirmé
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await user.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(interval);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, router]);

  const handleResend = async () => {
    setSending(true);
    setError("");
    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        setError(t("errors.tooManyRequests"));
      } else {
        setError(t("errors.generic"));
      }
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kash<span className="text-emerald-600 dark:text-emerald-500">Flo</span></h1>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-gray-900 dark:text-white font-semibold text-xl mb-2">{t("title")}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {t.rich("message", {
              email: user?.email || "",
              strong: (chunks) => <strong className="text-gray-900 dark:text-white">{chunks}</strong>
            })}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6 text-gray-500 text-sm">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            {t("waiting")}
          </div>

          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors mb-3"
          >
            {sending ? t("resending") : sent ? t("resent") : t("resend")}
          </button>

          {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}

          <button
            onClick={() => logoutUser().then(() => router.push("/login"))}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm transition-colors"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}