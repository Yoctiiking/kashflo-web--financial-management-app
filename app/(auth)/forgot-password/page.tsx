"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { forgotPassword } from "@/lib/firebase/auth";
import Link from "next/link";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("auth.forgotPassword");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t("errorEmailRequired"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("title")}</h2>

      {sent ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">📧</div>
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">
            {t.rich("sentMessage", {
              email,
              strong: (chunks) => <strong className="text-gray-900 dark:text-white">{chunks}</strong>
            })}
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {t("description")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("emailLabel")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            <Link href="/login" className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t("backToLogin")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}