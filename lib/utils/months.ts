import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { Language } from "@/lib/providers/LanguageProvider";

export const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

const DATE_FNS_LOCALES = { fr, en: enUS };

export const getDateFnsLocale = (language: Language) => DATE_FNS_LOCALES[language];

export const getMonthNames = (language: Language): string[] =>
  Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM", { locale: DATE_FNS_LOCALES[language] }));
