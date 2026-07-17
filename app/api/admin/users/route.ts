import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin, getAdminEmails } from "@/lib/firebase/adminAuthCheck";

export async function GET(req: NextRequest) {
  const check = await requireAdmin(req);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const adminAuth = getAdminAuth();
    const authUsers: { uid: string; email: string | null; creationTime: string; lastSignInTime: string | null; disabled: boolean }[] = [];
    let pageToken: string | undefined;
    do {
      const result = await adminAuth.listUsers(1000, pageToken);
      for (const u of result.users) {
        authUsers.push({
          uid: u.uid,
          email: u.email ?? null,
          creationTime: u.metadata.creationTime,
          lastSignInTime: u.metadata.lastSignInTime ?? null,
          disabled: u.disabled
        });
      }
      pageToken = result.pageToken;
    } while (pageToken);

    const profilesSnap = await getAdminDb().collection("users").get();
    const profiles = new Map(profilesSnap.docs.map(d => [d.id, d.data()]));
    const adminEmails = getAdminEmails();

    const users = authUsers.map(u => {
      const profile = profiles.get(u.uid);
      const lastActiveAt = profile?.lastActiveAt?.toDate?.() ?? null;
      const isEnvAdmin = !!u.email && adminEmails.includes(u.email.toLowerCase());
      return {
        uid: u.uid,
        email: u.email ?? profile?.email ?? null,
        displayName: profile?.displayName ?? null,
        disabled: u.disabled,
        createdAt: (profile?.createdAt?.toDate?.() ?? new Date(u.creationTime)).toISOString(),
        lastSignInTime: u.lastSignInTime,
        lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
        isAdmin: isEnvAdmin || !!profile?.isAdmin,
        isEnvAdmin
      };
    });

    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("Erreur GET /api/admin/users :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
