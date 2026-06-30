import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getGroup } from "@/lib/firebase/firestore";
import { convertFromBase } from "@/lib/currencyConverter";

export function useCurrency() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("CAD");
  const [rate, setRate] = useState(1); // taux CAD → devise actuelle
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      const group = await getGroup(profile.groupId);
      if (!group) return;
      setCurrency(group.currency);

      if (group.currency === "CAD") {
        setRate(1);
      } else {
        try {
          const converted = await convertFromBase(1, group.currency);
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

  // amount est toujours en CAD (devise pivot stockée en base)
  const formatCurrency = useCallback((amount: number) => {
    const converted = amount * rate;
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(converted);
  }, [currency, rate]);

  return { currency, formatCurrency, ready };
}