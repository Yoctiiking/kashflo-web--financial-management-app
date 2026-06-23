import { auth } from "./config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

// export const registerUser = async (
//   email: string,
//   password: string,
//   displayName: string
// ) => {
//   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//   const user = userCredential.user;

//   await updateProfile(user, { displayName });

//   // Créer le groupe solo par défaut
//   const groupId = `group_${user.uid}`;

//   await setDoc(doc(db, "users", user.uid), {
//     displayName,
//     email,
//     photoURL: null,
//     groupId,
//     createdAt: serverTimestamp()
//   });

//   await setDoc(doc(db, "groups", groupId), {
//     name: "Mes finances",
//     members: [user.uid],
//     createdBy: user.uid,
//     currency: "CAD",
//     createdAt: serverTimestamp()
//   });

//   return user;
// };

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ Auth créé :", user.uid);

    await updateProfile(user, { displayName });
    console.log("✅ Profil mis à jour");

    const groupId = `group_${user.uid}`;

    await setDoc(doc(db, "users", user.uid), {
      displayName,
      email,
      photoURL: null,
      groupId,
      createdAt: serverTimestamp()
    });
    console.log("✅ User Firestore créé");

    await setDoc(doc(db, "groups", groupId), {
      name: "Mes finances",
      members: [user.uid],
      createdBy: user.uid,
      currency: "CAD",
      createdAt: serverTimestamp()
    });
    console.log("✅ Groupe Firestore créé");

    return user;
  } catch (err) {
    console.error("❌ Erreur registerUser :", err);
    throw err;
  }
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};