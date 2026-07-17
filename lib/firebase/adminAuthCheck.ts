import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

export const requireAdmin = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "Non authentifié", status: 401 } as const;

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (err: any) {
    console.error("Erreur de vérification du token admin :", err);
    return { error: "Token invalide", status: 401 } as const;
  }

  const email = decoded.email?.toLowerCase();
  const isEnvAdmin = !!email && getAdminEmails().includes(email);

  if (!isEnvAdmin) {
    try {
      const profileSnap = await getAdminDb().collection("users").doc(decoded.uid).get();
      if (!profileSnap.data()?.isAdmin) {
        return { error: "Accès refusé", status: 403 } as const;
      }
    } catch (err: any) {
      console.error("Erreur de vérification du statut admin :", err);
      return { error: err?.message || "Erreur serveur", status: 500 } as const;
    }
  }

  return { uid: decoded.uid, email: email ?? null } as const;
};
