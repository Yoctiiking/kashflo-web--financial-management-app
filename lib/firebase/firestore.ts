import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";
import { Transaction, Budget, UserProfile } from "@/types";

// Récupérer le profil utilisateur et son groupId
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL,
    groupId: data.groupId,
    createdAt: (data.createdAt as Timestamp).toDate()
  };
};

// Récupérer les transactions du mois en cours
export const getMonthTransactions = async (groupId: string): Promise<Transaction[]> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const q = query(
    collection(db, "groups", groupId, "transactions"),
    where("date", ">=", Timestamp.fromDate(startOfMonth)),
    where("date", "<=", Timestamp.fromDate(endOfMonth)),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: (doc.data().date as Timestamp).toDate(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Transaction[];
};

// Récupérer les 5 dernières transactions
export const getRecentTransactions = async (groupId: string): Promise<Transaction[]> => {
  const q = query(
    collection(db, "groups", groupId, "transactions"),
    orderBy("date", "desc"),
    limit(5)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: (doc.data().date as Timestamp).toDate(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Transaction[];
};

// Récupérer tous les budgets
export const getBudgets = async (groupId: string): Promise<Budget[]> => {
  const q = query(collection(db, "groups", groupId, "budgets"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Budget[];
};