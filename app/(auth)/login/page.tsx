"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { loginUser } from "@/lib/firebase/auth";
import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth.login");

  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
        return t("errors.invalidCredential");
      case "auth/too-many-requests":
        return t("errors.tooManyRequests");
      default:
        return t("errors.generic");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t("title")}</h2>

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-gray-600 dark:text-gray-400">{t("passwordLabel")}</label>
            <Link
              href={`/forgot-password${email && isValidEmail(email) ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}