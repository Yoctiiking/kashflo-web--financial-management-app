"use client";

import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";
import StatusPage from "@/components/StatusPage";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <StatusPage
      icon={SearchX}
      title={t("title")}
      message={t("message")}
    />
  );
}
