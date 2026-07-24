"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useAuth } from "./AuthProvider";
import { useUserProfile } from "./UserProfileProvider";
import { updateUserLanguage } from "@/lib/firebase/firestore";
import frMessages from "@/messages/fr.json";
import enMessages from "@/messages/en.json";

export type Language = "fr" | "en";

const MESSAGES: Record<Language, typeof frMessages> = {
  fr: frMessages,
  en: enMessages
};

const STORAGE_KEY = "kashflo-language";
const SUPPORTED_LANGUAGES: Language[] = ["fr", "en"];

export const detectDeviceLanguage = (): Language => {
  if (typeof navigator === "undefined") return "fr";
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const primary = locale?.split("-")[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(primary as Language)) return primary as Language;
  }
  return "fr";
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLanguage: () => {}
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [language, setLanguageState] = useState<Language>("fr");

  // Valeur immédiate depuis le stockage local (choix explicite passé), sinon la langue
  // de l'appareil — avant que le profil Firestore n'arrive.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setLanguageState(stored === "fr" || stored === "en" ? stored : detectDeviceLanguage());
  }, []);

  // Le profil Firestore reste la source de vérité une fois chargé (cohérence multi-appareils)
  useEffect(() => {
    if (profile?.language === "fr" || profile?.language === "en") {
      setLanguageState(profile.language);
      localStorage.setItem(STORAGE_KEY, profile.language);
    }
  }, [profile?.language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (user) {
      updateUserLanguage(user.uid, next).catch((err) => console.error("Erreur mise à jour langue:", err));
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <NextIntlClientProvider locale={language} messages={MESSAGES[language]} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
