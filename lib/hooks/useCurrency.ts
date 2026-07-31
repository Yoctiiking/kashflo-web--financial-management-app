import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile } from "@/lib/firebase/firestore";
import { convertFromBase } from "@/lib/currencyConverter";

const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: "$ CA", USD: "$ US", EUR: "€", GBP: "£", CHF: "CHF", XOF: "FCFA"
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function useCurrency() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("CAD");
  const [rate, setRate] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setCurrency(profile.currency);

      if (profile.currency === "CAD") {
        setRate(1);
      } else {
        try {
          const converted = await convertFromBase(1, profile.currency);
          setRate(converted);
        } catch (err) {
          console.error("Erreur conversion devise:", err);
          setRate(1);
        }
      }
      setReady(true);
    };
    load();
  }, [user]);

  // Formate une valeur déjà exprimée dans `currency` (aucune conversion appliquée) —
  // utilisé directement par formatCurrency (après conversion CAD → devise affichée)
  // et par displayAmount quand le montant d'origine est réutilisé tel quel.
  const formatRaw = useCallback((value: number) => {
    if (Math.abs(value) >= 1_000_000) {
      return new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency,
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 3,
      }).format(value);
    }
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(value);
  }, [currency]);

  const formatCurrency = useCallback((amount: number) => {
    return formatRaw(amount * rate);
  }, [formatRaw, rate]);

  // Montant saisi dans la devise affichée → CAD à stocker
  const toBase = useCallback((amount: number) => {
    return amount / rate;
  }, [rate]);

  // CAD stocké → montant numérique dans la devise affichée (pour pré-remplir un formulaire d'édition)
  const fromBase = useCallback((amount: number) => {
    return amount * rate;
  }, [rate]);

  // Affiche un montant sans dérive dans le temps : si la devise active de l'utilisateur
  // n'a pas changé depuis la création (originalCurrency === currency), on réaffiche
  // originalAmount tel quel (pas de repassage par le taux de change actuel). Sinon, ou
  // si les champs d'origine sont absents (données créées avant cette fonctionnalité),
  // on retombe sur la conversion CAD habituelle — comportement inchangé.
  const displayAmount = useCallback((amount: number, originalAmount?: number, originalCurrency?: string) => {
    if (originalAmount !== undefined && originalCurrency !== undefined && originalCurrency === currency) {
      return formatRaw(originalAmount);
    }
    return formatCurrency(amount);
  }, [formatRaw, formatCurrency, currency]);

  return { currency, formatCurrency, displayAmount, toBase, fromBase, ready, symbol: getCurrencySymbol(currency) };
}