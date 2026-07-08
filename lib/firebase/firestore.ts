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
  arrayRemove,
  arrayUnion,
  writeBatch,
  onSnapshot
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
  RecurrenceFrequency,
  SavingsGoal,
  SharedExpense,
  SharedBudget
} from "@/types";

// ─── USER PROFILE ───

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL,
    currency: data.currency ?? "CAD",
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
    onboardingVersion: data.onboardingVersion ?? 0
  };
};

export const updateOnboardingVersion = async (userId: string, version: number) => {
  await updateDoc(doc(db, "users", userId), { onboardingVersion: version });
};

export const resetOnboarding = async (userId: string) => {
  await updateDoc(doc(db, "users", userId), { onboardingVersion: 0 });
};

export const updateUserCurrency = async (userId: string, currency: string) => {
  await updateDoc(doc(db, "users", userId), { currency });
};

// ─── TRANSACTIONS ───

export const getMonthTransactions = async (
  userId: string,
  year?: number,
  month?: number
): Promise<Transaction[]> => {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const q = query(
    collection(db, "users", userId, "transactions"),
    where("date", ">=", Timestamp.fromDate(startOfMonth)),
    where("date", "<=", Timestamp.fromDate(endOfMonth)),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: (doc.data().date as Timestamp).toDate(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Transaction[];
};

export const getRecentTransactions = async (userId: string): Promise<Transaction[]> => {
  const q = query(
    collection(db, "users", userId, "transactions"),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc"),
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
  userId: string,
  months: number = 6
): Promise<Transaction[]> => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const q = query(
    collection(db, "users", userId, "transactions"),
    where("date", ">=", Timestamp.fromDate(startDate)),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
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
  userId: string,
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
  const ref = collection(db, "users", userId, "transactions");
  await addDoc(ref, {
    ...data,
    date: Timestamp.fromDate(data.date),
    recurrenceId: data.recurrenceId ?? null,
    createdAt: serverTimestamp()
  });
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  await deleteDoc(doc(db, "users", userId, "transactions", transactionId));
};

// ─── BUDGETS ───

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const q = query(collection(db, "users", userId, "budgets"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as Budget[];
};

export const addBudget = async (
  userId: string,
  data: { category: string; limit: number; period: BudgetPeriod }
) => {
  const ref = collection(db, "users", userId, "budgets");
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
};

export const updateBudget = async (
  userId: string,
  budgetId: string,
  data: { category: string; limit: number; period: BudgetPeriod }
) => {
  await updateDoc(doc(db, "users", userId, "budgets", budgetId), data);
};

export const deleteBudget = async (userId: string, budgetId: string) => {
  await deleteDoc(doc(db, "users", userId, "budgets", budgetId));
};

// ─── RECURRENCES ───

export const getRecurrences = async (userId: string): Promise<Recurrence[]> => {
  const q = query(
    collection(db, "users", userId, "recurrences"),
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
  userId: string,
  data: {
    amount: number;
    type: TransactionType;
    category: string;
    label: string;
    frequency: RecurrenceFrequency;
    nextOccurrence: Date;
    customDays?: number;
  }
) => {
  const ref = collection(db, "users", userId, "recurrences");
  const { customDays, ...rest } = data;
  await addDoc(ref, {
    ...rest,
    ...(customDays !== undefined && { customDays }),
    nextOccurrence: Timestamp.fromDate(data.nextOccurrence),
    isActive: true,
    createdAt: serverTimestamp()
  });
};

export const deleteRecurrence = async (userId: string, recurrenceId: string) => {
  await deleteDoc(doc(db, "users", userId, "recurrences", recurrenceId));
};

export const toggleRecurrence = async (
  userId: string,
  recurrenceId: string,
  isActive: boolean
) => {
  await updateDoc(doc(db, "users", userId, "recurrences", recurrenceId), { isActive });
};

export const updateRecurrenceNextOccurrence = async (
  userId: string,
  recurrenceId: string,
  nextOccurrence: Date
) => {
  await updateDoc(doc(db, "users", userId, "recurrences", recurrenceId), {
    nextOccurrence: Timestamp.fromDate(nextOccurrence)
  });
};

// ─── SAVINGS GOALS ───

export const getSavingsGoals = async (userId: string): Promise<SavingsGoal[]> => {
  const q = query(
    collection(db, "users", userId, "savingsGoals"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    targetDate: doc.data().targetDate ? (doc.data().targetDate as Timestamp).toDate() : undefined,
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as SavingsGoal[];
};

export const addSavingsGoal = async (
  userId: string,
  data: { name: string; targetAmount: number; currentAmount: number; targetDate?: Date }
) => {
  const ref = collection(db, "users", userId, "savingsGoals");
  const { targetDate, ...rest } = data;
  await addDoc(ref, {
    ...rest,
    ...(targetDate !== undefined && { targetDate: Timestamp.fromDate(targetDate) }),
    createdAt: serverTimestamp()
  });
};

export const updateSavingsGoal = async (
  userId: string,
  goalId: string,
  data: { name: string; targetAmount: number; currentAmount: number; targetDate?: Date }
) => {
  const { targetDate, ...rest } = data;
  await updateDoc(doc(db, "users", userId, "savingsGoals", goalId), {
    ...rest,
    ...(targetDate !== undefined && { targetDate: Timestamp.fromDate(targetDate) })
  });
};

export const deleteSavingsGoal = async (userId: string, goalId: string) => {
  await deleteDoc(doc(db, "users", userId, "savingsGoals", goalId));
};

export const addToSavingsGoal = async (userId: string, goalId: string, amount: number) => {
  await updateDoc(doc(db, "users", userId, "savingsGoals", goalId), {
    currentAmount: increment(amount)
  });
};

// ─── SHARED BUDGETS ───

export const getSharedBudgets = async (userId: string): Promise<SharedBudget[]> => {
  const q = query(
    collection(db, "sharedBudgets"),
    where("members", "array-contains", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as SharedBudget[];
};

export const createSharedBudget = async (
  data: { name: string; limit: number; period: BudgetPeriod; category: string; createdBy: string }
) => {
  const ref = collection(db, "sharedBudgets");
  const docRef = await addDoc(ref, {
    ...data,
    members: [data.createdBy],
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateSharedBudget = async (
  budgetId: string,
  data: { name: string; limit: number; period: BudgetPeriod; category: string }
) => {
  await updateDoc(doc(db, "sharedBudgets", budgetId), data);
};

export const deleteSharedBudget = async (budgetId: string) => {
  await deleteDoc(doc(db, "sharedBudgets", budgetId));
};

export const subscribeToUserProfile = (
  uid: string,
  callback: (profile: { displayName?: string } | null) => void
) => {
  return onSnapshot(doc(db, "users", uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as any) : null);
    },
    (error) => {
      if (error.code !== "permission-denied") {
        console.error("Erreur listener profil:", error);
      }
      callback(null);
    }
  );
};

export const subscribeToSharedExpenses = (
  budgetId: string,
  callback: (expenses: SharedExpense[]) => void
) => {
  const q = query(
    collection(db, "sharedBudgets", budgetId, "expenses"),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q,
    (snapshot) => {
      const expenses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date ? (data.date as Timestamp).toDate() : new Date(),
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
        };
      }) as SharedExpense[];
      callback(expenses);
    },
    (error) => {
      if (error.code !== "permission-denied") {
        console.error("Erreur listener dépenses:", error);
      }
      callback([]);
    }
  );
};

export const subscribeToSharedBudget = (
  budgetId: string,
  callback: (budget: SharedBudget | null) => void
) => {
  const ref = doc(db, "sharedBudgets", budgetId);
  return onSnapshot(ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
      } as SharedBudget);
    },
    (error) => {
      if (error.code !== "permission-denied") {
        console.error("Erreur listener budget:", error);
      }
      callback(null);
    }
  );
};

export const getSharedExpenses = async (budgetId: string): Promise<SharedExpense[]> => {
  const q = query(
    collection(db, "sharedBudgets", budgetId, "expenses"),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: (doc.data().date as Timestamp).toDate(),
    createdAt: (doc.data().createdAt as Timestamp).toDate()
  })) as SharedExpense[];
};

export const addSharedExpense = async (
  budgetId: string,
  data: { amount: number; label: string; date: Date; addedBy: string; addedByName: string }
) => {
  const ref = collection(db, "sharedBudgets", budgetId, "expenses");
  await addDoc(ref, {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp()
  });
};

export const updateSharedExpense = async (
  budgetId: string,
  expenseId: string,
  data: { amount: number; label: string; date: Date }
) => {
  await updateDoc(doc(db, "sharedBudgets", budgetId, "expenses", expenseId), {
    ...data,
    date: Timestamp.fromDate(data.date)
  });
};

export const deleteSharedExpense = async (budgetId: string, expenseId: string) => {
  await deleteDoc(doc(db, "sharedBudgets", budgetId, "expenses", expenseId));
};

// ─── SHARED BUDGET INVITES ───

export const createSharedBudgetInvite = async (
  budgetId: string,
  createdBy: string,
  expiresInMinutes: number,
  multipleUse: boolean
): Promise<string> => {
  const code = nanoid(10);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  const budgetDoc = await getDoc(doc(db, "sharedBudgets", budgetId));
  const budgetName = budgetDoc.exists() ? budgetDoc.data().name : "Budget partagé";

  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "sharedBudgets", budgetId, "invites", code), {
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    multipleUse,
    usedCount: 0,
    budgetName
  });

  return code;
};

export const getSharedBudgetInvite = async (budgetId: string, code: string) => {
  const docRef = doc(db, "sharedBudgets", budgetId, "invites", code);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    code,
    createdBy: data.createdBy,
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    multipleUse: data.multipleUse,
    usedCount: data.usedCount,
    budgetName: data.budgetName
  };
};

export const useSharedBudgetInvite = async (
  budgetId: string,
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  const invite = await getSharedBudgetInvite(budgetId, code);
  if (!invite) return { success: false, error: "Lien invalide" };
  if (invite.expiresAt < new Date()) return { success: false, error: "Lien expiré" };
  if (!invite.multipleUse && invite.usedCount >= 1) return { success: false, error: "Lien déjà utilisé" };

  await updateDoc(doc(db, "sharedBudgets", budgetId), {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, "sharedBudgets", budgetId, "invites", code), {
    usedCount: increment(1)
  });

  return { success: true };
};

export const removeMemberFromSharedBudget = async (budgetId: string, userId: string) => {
  await updateDoc(doc(db, "sharedBudgets", budgetId), {
    members: arrayRemove(userId)
  });
};

export const leaveSharedBudget = async (budgetId: string, userId: string) => {
  await updateDoc(doc(db, "sharedBudgets", budgetId), {
    members: arrayRemove(userId)
  });
};

// ─── MIGRATION TRANSACTION ↔ SHARED BUDGET ───

export const migrateTransactionToSharedBudget = async (
  userId: string,
  transactionId: string,
  budgetId: string,
  transaction: { amount: number; label: string; date: Date; addedByName: string }
) => {
  const batch = writeBatch(db);

  batch.delete(doc(db, "users", userId, "transactions", transactionId));

  const expenseRef = doc(collection(db, "sharedBudgets", budgetId, "expenses"));
  batch.set(expenseRef, {
    amount: transaction.amount,
    label: transaction.label,
    date: Timestamp.fromDate(transaction.date),
    addedBy: userId,
    addedByName: transaction.addedByName,
    createdAt: serverTimestamp()
  });

  await batch.commit();
};

export const unshareExpenseToPersonal = async (
  budgetId: string,
  expenseId: string,
  expense: { amount: number; label: string; date: Date; addedBy: string }
) => {
  const batch = writeBatch(db);

  batch.delete(doc(db, "sharedBudgets", budgetId, "expenses", expenseId));

  const transactionRef = doc(collection(db, "users", expense.addedBy, "transactions"));
  batch.set(transactionRef, {
    amount: expense.amount,
    type: "expense",
    category: "Autre",
    label: expense.label,
    date: Timestamp.fromDate(expense.date),
    addedBy: expense.addedBy,
    recurrenceId: null,
    createdAt: serverTimestamp()
  });

  await batch.commit();
};

// ─── FEEDBACK ───

export const saveFeedback = async (data: {
  name: string;
  email: string;
  message: string;
  userId?: string;
}) => {
  const ref = collection(db, "feedback");
  await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp()
  });
};