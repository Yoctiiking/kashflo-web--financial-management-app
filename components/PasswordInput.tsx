"use client";

import { useState, InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  variant?: "default" | "danger";
};

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  default: "border-gray-300 dark:border-gray-700 focus:border-emerald-500",
  danger: "border-red-500/30 focus:border-red-500"
};

export default function PasswordInput({ variant = "default", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("common.passwordInput");

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-xl pl-4 pr-11 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none transition-colors ${VARIANT_CLASSES[variant]}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? t("hide") : t("show")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
