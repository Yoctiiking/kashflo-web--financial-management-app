"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true
});

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Heartbeat de présence : permet à la page /admin d'estimer qui est "en ligne".
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      updateDoc(doc(db, "users", user.uid), { lastActiveAt: serverTimestamp() }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", sendHeartbeat);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);