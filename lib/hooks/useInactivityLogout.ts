import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/firebase/auth";
import { User } from "firebase/auth";

const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const STORAGE_KEY = "kashflo_last_activity";

export function useInactivityLogout(user: User | null) {
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const checkInactivity = async () => {
      const lastActivity = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (lastActivity) {
        const elapsed = now - parseInt(lastActivity);
        if (elapsed > INACTIVITY_LIMIT_MS) {
          await logoutUser();
          localStorage.removeItem(STORAGE_KEY);
          router.push("/login");
          return;
        }
      }

      // Met à jour la dernière activité
      localStorage.setItem(STORAGE_KEY, now.toString());
    };

    checkInactivity();

    // Met à jour l'activité à chaque interaction significative
    const updateActivity = () => {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);

    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [user, router]);
}