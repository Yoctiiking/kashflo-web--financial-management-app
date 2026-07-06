"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { forgotPassword } from "@/lib/firebase/auth";
import Link from "next/link";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Entre ton adresse email");
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
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
      <h2 className="text-xl font-semibold text-white mb-2">Mot de passe oublié</h2>

      {sent ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">📧</div>
          <p className="text-gray-300 text-sm mb-6">
            Un lien de réinitialisation a été envoyé à <strong className="text-white">{email}</strong>.
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm mb-6">
            Entre ton adresse email et on t'enverra un lien pour réinitialiser ton mot de passe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="toi@exemple.com"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            <Link href="/login" className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Retour à la connexion
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
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}