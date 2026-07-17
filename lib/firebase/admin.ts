import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let auth: Auth | null = null;
let db: Firestore | null = null;

const getApp = () => {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK non configuré : FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY sont requis."
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
};

export const getAdminAuth = () => {
  if (!auth) auth = getAuth(getApp());
  return auth;
};

export const getAdminDb = () => {
  if (!db) db = getFirestore(getApp());
  return db;
};
