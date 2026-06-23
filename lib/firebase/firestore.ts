import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
  Timestamp,
  updateDoc, 
  increment, 
  setDoc,
  arrayRemove,
  arrayUnion
} from "firebase/firestore";
import { db } from "./config";
import { nanoid } from "nanoid";
import { Transaction, Budget, UserProfile, TransactionType, BudgetPeriod, Recurrence, RecurrenceFrequency } from "@/types";

export interface Invite {
  code: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  multipleUse: boolean;
  usedCount: number;
}
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

export const addTransaction = async (
  groupId: string,
  data: {
    amount: number;
    type: TransactionType;
    category: string;
    label: string;
    date: Date;
    addedBy: string;
    recurrenceId?: string;  // ← optionnel avec le ?
  }
) => {
  const ref = collection(db, "groups", groupId, "transactions");
  await addDoc(ref, {
    ...data,
    date: Timestamp.fromDate(data.date),
    recurrenceId: null,
    createdAt: serverTimestamp()
  });
};

export const addBudget = async (
  groupId: string,
  data: {
    category: string;
    limit: number;
    period: BudgetPeriod;
  }
) => {
  const ref = collection(db, "groups", groupId, "budgets");
  await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp()
  });
};

export const deleteBudget = async (groupId: string, budgetId: string) => {
  const ref = doc(db, "groups", groupId, "budgets", budgetId);
  await deleteDoc(ref);
};

export const getRecurrences = async (groupId: string): Promise<Recurrence[]> => {
  const q = query(
    collection(db, "groups", groupId, "recurrences"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    nextOccurrence: (doc.data().nextOccurrence as Timestamp).toDate(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Recurrence[];
};

export const addRecurrence = async (
  groupId: string,
  data: {
    amount: number;
    type: TransactionType;
    category: string;
    label: string;
    frequency: RecurrenceFrequency;
    nextOccurrence: Date;
  }
) => {
  const ref = collection(db, "groups", groupId, "recurrences");
  await addDoc(ref, {
    ...data,
    nextOccurrence: Timestamp.fromDate(data.nextOccurrence),
    isActive: true,
    createdAt: serverTimestamp()
  });
};

export const deleteRecurrence = async (groupId: string, recurrenceId: string) => {
  const ref = doc(db, "groups", groupId, "recurrences", recurrenceId);
  await deleteDoc(ref);
};

export const toggleRecurrence = async (
  groupId: string,
  recurrenceId: string,
  isActive: boolean
) => {
  const ref = doc(db, "groups", groupId, "recurrences", recurrenceId);
  await updateDoc(ref, { isActive });
};

export const updateRecurrenceNextOccurrence = async (
  groupId: string,
  recurrenceId: string,
  nextOccurrence: Date
) => {
  const ref = doc(db, "groups", groupId, "recurrences", recurrenceId);
  await updateDoc(ref, {
    nextOccurrence: Timestamp.fromDate(nextOccurrence)
  });
};

export const getLastMonthsTransactions = async (
  groupId: string,
  months: number = 6
): Promise<Transaction[]> => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const q = query(
    collection(db, "groups", groupId, "transactions"),
    where("date", ">=", Timestamp.fromDate(startDate)),
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

export const getGroup = async (groupId: string) => {
  const docRef = doc(db, "groups", groupId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    members: data.members,
    createdBy: data.createdBy,
    currency: data.currency,
    createdAt: (data.createdAt as Timestamp).toDate()
  };
};

export const addMemberToGroup = async (groupId: string, userId: string, userEmail: string) => {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, "users", userId), {
    groupId
  });
};

export const removeMemberFromGroup = async (groupId: string, userId: string) => {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayRemove(userId)
  });
  const newGroupId = `group_${userId}`;
  await setDoc(doc(db, "groups", newGroupId), {
    name: "Mes finances",
    members: [userId],
    createdBy: userId,
    currency: "CAD",
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "users", userId), {
    groupId: newGroupId
  });
};

export const updateGroupName = async (groupId: string, name: string) => {
  await updateDoc(doc(db, "groups", groupId), { name });
};

export const createInvite = async (
  groupId: string,
  userId: string,
  expiresInMinutes: number,
  multipleUse: boolean
): Promise<string> => {
  const code = nanoid(10); // code unique de 10 caractères
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  await setDoc(doc(db, "groups", groupId, "invites", code), {
    createdBy: userId,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    multipleUse,
    usedCount: 0
  });

  return code;
};

export const getInvite = async (
  groupId: string,
  code: string
): Promise<Invite | null> => {
  const docRef = doc(db, "groups", groupId, "invites", code);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    code,
    createdBy: data.createdBy,
    createdAt: (data.createdAt as Timestamp).toDate(),
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    multipleUse: data.multipleUse,
    usedCount: data.usedCount
  };
};

export const useInvite = async (
  groupId: string,
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  const invite = await getInvite(groupId, code);

  if (!invite) return { success: false, error: "Lien invalide" };
  if (invite.expiresAt < new Date()) return { success: false, error: "Lien expiré" };
  if (!invite.multipleUse && invite.usedCount >= 1) return { success: false, error: "Lien déjà utilisé" };

  // Vérifie si l'utilisateur est déjà membre
  const group = await getGroup(groupId);
  if (group?.members.includes(userId)) return { success: false, error: "Tu es déjà membre de ce groupe" };

  // Ajoute au groupe
  await addMemberToGroup(groupId, userId, "");

  // Incrémente usedCount
  await updateDoc(doc(db, "groups", groupId, "invites", code), {
    usedCount: increment(1)
  });

  return { success: true };
};

export const getGroupInvites = async (groupId: string): Promise<Invite[]> => {
  const q = query(
    collection(db, "groups", groupId, "invites"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    code: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
    expiresAt: (doc.data().expiresAt as Timestamp).toDate()
  })) as Invite[];
};

export const deleteInvite = async (groupId: string, code: string) => {
  await deleteDoc(doc(db, "groups", groupId, "invites", code));
};