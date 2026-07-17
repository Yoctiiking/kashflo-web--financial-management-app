import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/adminAuthCheck";

const SUBCOLLECTIONS = ["transactions", "budgets", "recurrences", "savingsGoals"];

async function deleteCollection(collectionRef: FirebaseFirestore.CollectionReference) {
  const snapshot = await collectionRef.get();
  await Promise.all(snapshot.docs.map(d => d.ref.delete()));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const check = await requireAdmin(req);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { uid } = await params;

  if (uid === check.uid) {
    return NextResponse.json({ error: "Impossible de supprimer son propre compte depuis l'admin" }, { status: 400 });
  }

  try {
    const adminDb = getAdminDb();

    for (const col of SUBCOLLECTIONS) {
      await deleteCollection(adminDb.collection("users").doc(uid).collection(col));
    }

    const sharedBudgetsSnap = await adminDb
      .collection("sharedBudgets")
      .where("members", "array-contains", uid)
      .get();

    for (const budgetDoc of sharedBudgetsSnap.docs) {
      const data = budgetDoc.data();
      if (data.createdBy === uid) {
        await deleteCollection(budgetDoc.ref.collection("expenses"));
        await deleteCollection(budgetDoc.ref.collection("invites"));
        await budgetDoc.ref.delete();
      } else {
        await budgetDoc.ref.update({
          members: data.members.filter((m: string) => m !== uid)
        });
      }
    }

    await adminDb.collection("users").doc(uid).delete();

    try {
      await getAdminAuth().deleteUser(uid);
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        throw err;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erreur DELETE /api/admin/users/[uid] :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const check = await requireAdmin(req);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { uid } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin (boolean) requis" }, { status: 400 });
  }

  if (uid === check.uid) {
    return NextResponse.json({ error: "Impossible de modifier son propre statut administrateur" }, { status: 400 });
  }

  try {
    await getAdminDb().collection("users").doc(uid).set({ isAdmin: body.isAdmin }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erreur PATCH /api/admin/users/[uid] :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
