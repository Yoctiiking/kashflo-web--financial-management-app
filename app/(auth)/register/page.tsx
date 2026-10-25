"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { registerUser } from "@/lib/firebase/auth";
import PasswordInput from "@/components/PasswordInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Link from "next/link";

function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tCommon = useTranslations("auth.common");

  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      await registerUser(email, password, displayName);
      router.push(redirect);
    } catch (err: any) {
      switch (err.code) {
        case "auth/email-already-in-use":
          setError(t("errors.emailInUse"));
          break;
        default:
          setError(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  const getGoogleErrorMessage = (code: string) => {
    switch (code) {
      case "auth/account-exists-with-different-credential":
        return tCommon("errors.accountExistsDifferentCredential");
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return tCommon("errors.popupClosed");
      case "auth/popup-blocked":
        return tCommon("errors.popupBlocked");
      case "auth/unauthorized-domain":
        return tCommon("errors.unauthorizedDomain");
      case "auth/operation-not-allowed":
        return tCommon("errors.operationNotAllowed");
      default:
        return tCommon("errors.generic");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t("title")}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("nameLabel")}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder={t("namePlaceholder")}
            required
          />
        </div>

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
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("passwordLabel")}</label>
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

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        <span className="text-gray-500 text-xs">{tCommon("orDivider")}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      <GoogleSignInButton
        onSuccess={() => router.push(redirect)}
        onError={(code) => setError(getGoogleErrorMessage(code))}
      />

      <p className="text-center text-gray-500 text-sm mt-6">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
