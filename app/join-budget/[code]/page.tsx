"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getSharedBudgetInvite, useSharedBudgetInvite } from "@/lib/firebase/firestore";
import Link from "next/link";
import { Loader2, XCircle, Clock, Lock, Users, CheckCircle2 } from "lucide-react";

type Status = "loading" | "valid" | "expired" | "used" | "invalid" | "joining" | "success" | "error";

export default function JoinBudgetPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("joinBudget");
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
      setErrorMessage(result.error || t("errorGeneric"));
    }
  };

  const states: Record<Status, { icon: React.ReactNode; title: React.ReactNode; message: string; action?: React.ReactNode }> = {
    loading: { icon: <Loader2 className="w-10 h-10 animate-spin" strokeWidth={2} />, title: t("loadingTitle"), message: t("loadingMessage") },
    invalid: { icon: <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" strokeWidth={2} />, title: t("invalidTitle"), message: t("invalidMessage") },
    expired: { icon: <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" strokeWidth={2} />, title: t("expiredTitle"), message: t("expiredMessage") },
    used: { icon: <Lock className="w-10 h-10 text-gray-500" strokeWidth={2} />, title: t("usedTitle"), message: t("usedMessage") },
    valid: {
      icon: <Users className="w-10 h-10 text-emerald-600 dark:text-emerald-500" strokeWidth={2} />,
      title: budgetName ? (
        <>
          {t("joinBudgetTitle")}
          <br />
          <span className="text-emerald-600 dark:text-emerald-500">{budgetName}</span>
        </>
      ) : t("joinSharedBudgetTitle"),
      message: user ? t("invitedMessage") : t("loginPromptMessage"),
      action: user ? (
        <button onClick={handleJoin} className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors mt-4">
          {t("join")}
        </button>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          <Link href={`/login?redirect=/join-budget/${code}`} className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors text-center">{t("login")}</Link>
          <Link href={`/register?redirect=/join-budget/${code}`} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors text-center">{t("createAccount")}</Link>
        </div>
      )
    },
    joining: { icon: <Loader2 className="w-10 h-10 animate-spin" strokeWidth={2} />, title: t("joiningTitle"), message: t("joiningMessage") },
    success: { icon: <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />, title: t("successTitle"), message: t("successMessage") },
    error: { icon: <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" strokeWidth={2} />, title: t("errorTitle"), message: errorMessage }
  };

  const current = states[status];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kash<span className="text-emerald-600 dark:text-emerald-500">Flo</span></h1>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">{current.icon}</div>
          <h2 className="text-gray-900 dark:text-white font-semibold text-xl mb-2">{current.title}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{current.message}</p>
          {current.action}
        </div>
      </div>
    </div>
  );
}