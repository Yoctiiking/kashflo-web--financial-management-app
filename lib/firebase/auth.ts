import { auth } from "./config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc, deleteDoc, arrayRemove, collection, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  const groupId = `group_${user.uid}`;

  await setDoc(doc(db, "users", user.uid), {
    displayName,
    email,
    photoURL: null,
    groupId,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "groups", groupId), {
    name: "Mes finances",
    members: [user.uid],
    createdBy: user.uid,
    currency: "CAD",
    createdAt: serverTimestamp()
  });

  await sendEmailVerification(user, {
    url: `${APP_URL}/verify-email-complete`,
    handleCodeInApp: false
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

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) return;
  await sendEmailVerification(user, {
  url: `${APP_URL}/verify-email-complete`,
  handleCodeInApp: false
});
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