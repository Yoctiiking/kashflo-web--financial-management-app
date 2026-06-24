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
import {
  Transaction,
  Budget,
  UserProfile,
  TransactionType,
  BudgetPeriod,
  Recurrence,
  RecurrenceFrequency
} from "@/types";

export interface Invite {
  code: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  multipleUse: boolean;
  usedCount: number;
  groupName: string;
}

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
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
  };
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
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
  };
};

export const addMemberToGroup = async (groupId: string, userId: string) => {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, "users", userId), { groupId });
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
  await updateDoc(doc(db, "users", userId), { groupId: newGroupId });
};

export const updateGroupName = async (groupId: string, name: string) => {
  await updateDoc(doc(db, "groups", groupId), { name });
};

export const updateGroupCurrency = async (groupId: string, currency: string) => {
  await updateDoc(doc(db, "groups", groupId), { currency });
};

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

export const addTransaction = async (
  groupId: string,
  data: {
    amount: number;
    type: TransactionType;
    category: string;
    label: string;
    date: Date;
    addedBy: string;
    recurrenceId?: string;
  }
) => {
  const ref = collection(db, "groups", groupId, "transactions");
  await addDoc(ref, {
    ...data,
    date: Timestamp.fromDate(data.date),
    recurrenceId: data.recurrenceId ?? null,
    createdAt: serverTimestamp()
  });
};

export const getBudgets = async (groupId: string): Promise<Budget[]> => {
  const q = query(collection(db, "groups", groupId, "budgets"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Budget[];
};

export const addBudget = async (
  groupId: string,
  data: { category: string; limit: number; period: BudgetPeriod }
) => {
  const ref = collection(db, "groups", groupId, "budgets");
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
};

export const deleteBudget = async (groupId: string, budgetId: string) => {
  await deleteDoc(doc(db, "groups", groupId, "budgets", budgetId));
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
  await deleteDoc(doc(db, "groups", groupId, "recurrences", recurrenceId));
};

export const toggleRecurrence = async (
  groupId: string,
  recurrenceId: string,
  isActive: boolean
) => {
  await updateDoc(doc(db, "groups", groupId, "recurrences", recurrenceId), { isActive });
};

export const updateRecurrenceNextOccurrence = async (
  groupId: string,
  recurrenceId: string,
  nextOccurrence: Date
) => {
  await updateDoc(doc(db, "groups", groupId, "recurrences", recurrenceId), {
    nextOccurrence: Timestamp.fromDate(nextOccurrence)
  });
};

export const createInvite = async (
  groupId: string,
  userId: string,
  expiresInMinutes: number,
  multipleUse: boolean
): Promise<string> => {
  const code = nanoid(10);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  const groupDoc = await getDoc(doc(db, "groups", groupId));
  const groupName = groupDoc.exists() ? groupDoc.data().name : "Groupe";

  await setDoc(doc(db, "groups", groupId, "invites", code), {
    createdBy: userId,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    multipleUse,
    usedCount: 0,
    groupName
  });

  return code;
};

export const getInvite = async (groupId: string, code: string): Promise<Invite | null> => {
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
    usedCount: data.usedCount,
    groupName: data.groupName
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

  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, "users", userId), { groupId });
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