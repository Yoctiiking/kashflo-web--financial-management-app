import { auth } from "./config";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./config";

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  // Créer le groupe solo par défaut
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

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
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

  // Réauthentification obligatoire avant de changer le mot de passe
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const deleteAccount = async (currentPassword: string, groupId: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  // Réauthentification obligatoire avant suppression
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Supprime les données Firestore
  await deleteDoc(doc(db, "users", user.uid));

  // Supprime le compte Auth
  await deleteUser(user);
};