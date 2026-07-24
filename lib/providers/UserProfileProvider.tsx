"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "./AuthProvider";

interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string | null;
  currency?: string;
  language?: string;
  expenseCategories?: string[];
  incomeCategories?: string[];
  isAdmin?: boolean;
}

interface UserProfileContextType {
  profile: UserProfile | null;
}

const UserProfileContext = createContext<UserProfileContextType>({ profile: null });

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error("Erreur listener profil utilisateur:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <UserProfileContext.Provider value={{ profile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);