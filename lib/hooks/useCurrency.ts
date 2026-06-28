import { useState, useEffect } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getUserProfile, getGroup } from "@/lib/firebase/firestore";

export function useCurrency() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("CAD");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      const group = await getGroup(profile.groupId);
      if (!group) return;
      setCurrency(group.currency);
    };
    load();
  }, [user]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(amount);

  return { currency, formatCurrency };
}