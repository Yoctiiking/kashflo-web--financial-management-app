"use client";

import { useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { resendVerificationEmail, logoutUser } from "@/lib/firebase/auth";

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      await user?.reload();
      if (user?.emailVerified) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Kash<span className="text-emerald-500">Flo</span></h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-white font-semibold text-xl mb-2">Vérifie ton email</h2>
          <p className="text-gray-400 text-sm mb-6">
            On a envoyé un lien de confirmation à <strong className="text-white">{user?.email}</strong>. Clique sur le lien pour activer ton compte.
          </p>

          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors mb-3"
          >
            {checking ? "Vérification..." : "J'ai vérifié mon email"}
          </button>

          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors mb-3"
          >
            {sending ? "Envoi..." : sent ? "✅ Email renvoyé" : "Renvoyer l'email"}
          </button>

          <button
            onClick={() => logoutUser().then(() => router.push("/login"))}
            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}