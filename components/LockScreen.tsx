"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { verifyPin } from "@/lib/pinLock";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const router = useRouter();
  const t = useTranslations("lockScreen");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");

    if (newPin.length === 4 || newPin.length === 6) {
      setChecking(true);
      const valid = await verifyPin(newPin);
      if (valid) {
        onUnlock();
      } else {
        setError(t("incorrect"));
        setTimeout(() => setPin(""), 400);
      }
      setChecking(false);
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError("");
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 z-[100] flex items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Kash<span className="text-emerald-600 dark:text-emerald-500">Flo</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-8">{t("prompt")}</p>

        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                i < pin.length ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-700"
              } ${error ? "border-red-500" : ""}`}
            />
          ))}
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              disabled={checking}
              className="aspect-square bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xl font-medium rounded-2xl transition-colors disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            disabled={checking}
            className="aspect-square bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xl font-medium rounded-2xl transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={checking}
            className="aspect-square bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-lg font-medium rounded-2xl transition-colors disabled:opacity-50"
          >
            ⌫
          </button>
        </div>

        <button
          onClick={() => logoutUser().then(() => router.push("/login"))}
          className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm transition-colors"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}