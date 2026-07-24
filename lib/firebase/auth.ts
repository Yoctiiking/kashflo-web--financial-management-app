import { auth } from "./config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  User
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc, deleteDoc, arrayRemove, collection, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { detectDeviceLanguage } from "@/lib/providers/LanguageProvider";

const sendVerificationEmail = async (user: User) => {
  await sendEmailVerification(user, { url: `${APP_URL}/verify-email-complete`, handleCodeInApp: false });
};

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Envoyé tout de suite après la création du compte, avant les autres appels Auth
  // (updateProfile) : Firebase compte les appels rapprochés à son API contre sa
  // protection anti-abus, et un envoi précédé de plusieurs autres requêtes se fait
  // parfois rejeter silencieusement (auth/too-many-requests) sans qu'aucune erreur ne
  // remonte à l'écran d'inscription. Un échec ici ne bloque pas le reste de
  // l'inscription : le bouton "Renvoyer" sur l'écran suivant reste un filet de sécurité.
  try {
    await sendVerificationEmail(user);
  } catch (err) {
    console.error("Échec de l'envoi automatique de l'email de vérification :", err);
  }

  await updateProfile(user, { displayName });

  const groupId = `group_${user.uid}`;

  await setDoc(doc(db, "users", user.uid), {
    displayName,
    email,
    photoURL: null,
    groupId,
    language: detectDeviceLanguage(),
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "groups", groupId), {
    name: "Mes finances",
    members: [user.uid],
    createdBy: user.uid,
    currency: "CAD",
    createdAt: serverTimestamp()
  });

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const forgotPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email, {
    url: `${APP_URL}/login`,
    handleCodeInApp: false
  });
};

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) return;
  await sendVerificationEmail(user);
};

export const updateDisplayName = async (displayName: string) => {
  const user = auth.currentUser;
  if (!user) return;
  await updateProfile(user, { displayName });
  await updateDoc(doc(db, "users", user.uid), { displayName });
};

export const updateUserPassword = async (
  currentPassword: string,
  newPassword: string
) => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const deleteAccount = async (currentPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  const collections = ["transactions", "budgets", "recurrences", "savingsGoals"];
  for (const col of collections) {
    const snapshot = await getDocs(collection(db, "users", user.uid, col));
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  }

  const sharedBudgetsQuery = query(
    collection(db, "sharedBudgets"),
    where("members", "array-contains", user.uid)
  );
  const sharedBudgetsSnapshot = await getDocs(sharedBudgetsQuery);

  for (const budgetDoc of sharedBudgetsSnapshot.docs) {
    const budgetData = budgetDoc.data();
    if (budgetData.createdBy === user.uid) {
      const expensesSnapshot = await getDocs(collection(db, "sharedBudgets", budgetDoc.id, "expenses"));
      await Promise.all(expensesSnapshot.docs.map(d => deleteDoc(d.ref)));

      const invitesSnapshot = await getDocs(collection(db, "sharedBudgets", budgetDoc.id, "invites"));
      await Promise.all(invitesSnapshot.docs.map(d => deleteDoc(d.ref)));

      await deleteDoc(budgetDoc.ref);
    } else {
      await updateDoc(budgetDoc.ref, {
        members: arrayRemove(user.uid)
      });
    }
  }

  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
};