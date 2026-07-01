"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getSharedBudgetInvite, useSharedBudgetInvite } from "@/lib/firebase/firestore";
import Link from "next/link";

type Status = "loading" | "valid" | "expired" | "used" | "invalid" | "joining" | "success" | "error";

export default function JoinBudgetPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        const [bId, inviteCode] = code.split("--");
        if (!bId || !inviteCode) { setStatus("invalid"); return; }
        setBudgetId(bId);
        const invite = await getSharedBudgetInvite(bId, inviteCode);
        if (!invite) { setStatus("invalid"); return; }
        if (invite.expiresAt < new Date()) { setStatus("expired"); return; }
        if (!invite.multipleUse && invite.usedCount >= 1) { setStatus("used"); return; }

        setBudgetName(invite.budgetName || "");
        setStatus("valid");
      } catch {
        setStatus("invalid");
      }
    };
    load();
  }, [code, authLoading]);

  const handleJoin = async () => {
    if (!user || !budgetId) return;
    const [bId, inviteCode] = code.split("--");
    setStatus("joining");
    const result = await useSharedBudgetInvite(bId, inviteCode, user.uid);
    if (result.success) {
      setStatus("success");
      setTimeout(() => router.push(`/shared-budgets/${bId}`), 2000);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Une erreur est survenue");
    }
  };

  const states: Record<Status, { icon: string; title: React.ReactNode; message: string; action?: React.ReactNode }> = {
    loading: { icon: "⏳", title: "Vérification...", message: "On vérifie ton invitation" },
    invalid: { icon: "❌", title: "Lien invalide", message: "Ce lien n'existe pas ou a été supprimé" },
    expired: { icon: "⏰", title: "Lien expiré", message: "Ce lien a expiré" },
    used: { icon: "🔒", title: "Lien déjà utilisé", message: "Ce lien à usage unique a déjà été utilisé" },
    valid: {
      icon: "👥",
      title: budgetName ? (
        <>
          Rejoindre le budget
          <br />
          <span className="text-emerald-500">{budgetName}</span>
        </>
      ) : "Rejoindre le budget partagé",
      message: user ? "Tu es invité à rejoindre ce budget partagé" : "Connecte-toi pour rejoindre ce budget",
      action: user ? (
        <button onClick={handleJoin} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors mt-4">
          Rejoindre
        </button>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          <Link href={`/login?redirect=/join-budget/${code}`} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors text-center">Se connecter</Link>
          <Link href={`/register?redirect=/join-budget/${code}`} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors text-center">Créer un compte</Link>
        </div>
      )
    },
    joining: { icon: "⏳", title: "Rejoindre...", message: "On t'ajoute au budget" },
    success: { icon: "✅", title: "Bienvenue !", message: "Tu as rejoint le budget. Redirection..." },
    error: { icon: "❌", title: "Erreur", message: errorMessage }
  };

  const current = states[status];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Kash<span className="text-emerald-500">Flo</span></h1>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">{current.icon}</div>
          <h2 className="text-white font-semibold text-xl mb-2">{current.title}</h2>
          <p className="text-gray-400 text-sm">{current.message}</p>
          {current.action}
        </div>
      </div>
    </div>
  );
}