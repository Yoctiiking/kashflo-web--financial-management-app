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

  const formatCurrency = useCallback((amount: number) => {
    const converted = amount * rate;
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(converted);
  }, [currency, rate]);

  return { currency, formatCurrency, ready, symbol: getCurrencySymbol(currency) };
}