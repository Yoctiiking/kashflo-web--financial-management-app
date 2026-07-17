"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import { useConfirm } from "@/lib/providers/ConfirmProvider";
import { isAdmin, isEnvAdminEmail } from "@/lib/admin";
import StatusPage from "@/components/StatusPage";
import {
  Search,
  RefreshCw,
  Trash2,
  ShieldAlert,
  ShieldPlus,
  ShieldMinus,
  ShieldCheck,
  ShieldOff,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ArrowUpDown,
  Check
} from "lucide-react";

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  createdAt: string;
  lastSignInTime: string | null;
  lastActiveAt: string | null;
  isAdmin: boolean;
  isEnvAdmin: boolean;
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const NOW_TICK_MS = 15 * 1000;

const isUserOnline = (lastActiveAt: string | null, now: number) =>
  !!lastActiveAt && now - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;

type SortKey = "name" | "status" | "role" | "createdAt" | "lastSignInTime";
type SortDir = "asc" | "desc";

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  status: "desc",
  role: "desc",
  createdAt: "desc",
  lastSignInTime: "desc"
};

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Utilisateur",
  status: "Statut",
  role: "Rôle",
  createdAt: "Inscription",
  lastSignInTime: "Dernière connexion"
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function AdminPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const confirm = useConfirm();
  const hasAccess = !!user && isAdmin(user.email, profile?.isAdmin);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState("");
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_SORT_DIR[key]);
    }
    setShowSortMenu(false);
  };

  // Ne fait vieillir le statut "en ligne" que via un tick local : Firestore ne pousse
  // pas de mise à jour du simple fait que le temps passe sans nouvelle écriture.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const loadUsers = useCallback(async () => {
    if (!user || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors du chargement");
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user, hasAccess]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Écoute temps réel Firestore (nom, statut admin, présence) : les champs propres à
  // Firebase Auth (dernière connexion, compte désactivé) ne sont pas "poussables" et
  // restent rafraîchis via l'API /api/admin/users (bouton "Actualiser").
  useEffect(() => {
    if (!hasAccess || !initialLoadDone) return;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      snapshot => {
        setUsers(prev => {
          const byUid = new Map(prev.map(u => [u.uid, u]));
          for (const change of snapshot.docChanges()) {
            const uid = change.doc.id;
            if (change.type === "removed") {
              byUid.delete(uid);
              continue;
            }
            const data = change.doc.data();
            const existing = byUid.get(uid);
            const email = (data.email as string | undefined) ?? existing?.email ?? null;
            const isEnvAdmin = isEnvAdminEmail(email);
            const createdAt = data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : existing?.createdAt ?? new Date().toISOString();
            const lastActiveAt = data.lastActiveAt instanceof Timestamp
              ? data.lastActiveAt.toDate().toISOString()
              : null;
            byUid.set(uid, {
              uid,
              email,
              displayName: (data.displayName as string | undefined) ?? existing?.displayName ?? null,
              disabled: existing?.disabled ?? false,
              createdAt,
              lastSignInTime: existing?.lastSignInTime ?? null,
              lastActiveAt,
              isAdmin: isEnvAdmin || !!data.isAdmin,
              isEnvAdmin
            });
          }
          return Array.from(byUid.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      },
      err => console.error("Erreur d'écoute temps réel des utilisateurs :", err)
    );

    return () => unsubscribe();
  }, [hasAccess, initialLoadDone]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = !q
      ? users
      : users.filter(
          u => u.email?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q)
        );

    const sign = sortDir === "asc" ? 1 : -1;
    return [...matching].sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const an = (a.displayName || a.email || "").toLowerCase();
          const bn = (b.displayName || b.email || "").toLowerCase();
          return sign * an.localeCompare(bn);
        }
        case "status":
          return sign * (Number(isUserOnline(a.lastActiveAt, now)) - Number(isUserOnline(b.lastActiveAt, now)));
        case "role":
          return sign * (Number(a.isAdmin) - Number(b.isAdmin));
        case "createdAt":
          return sign * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "lastSignInTime": {
          // Les comptes sans connexion enregistrée restent toujours en fin de liste,
          // quel que soit le sens du tri (sinon ils "polluent" le haut du tableau en tri croissant).
          if (!a.lastSignInTime && !b.lastSignInTime) return 0;
          if (!a.lastSignInTime) return 1;
          if (!b.lastSignInTime) return -1;
          return sign * (new Date(a.lastSignInTime).getTime() - new Date(b.lastSignInTime).getTime());
        }
      }
    });
  }, [users, search, sortKey, sortDir, now]);

  const handleDelete = async (target: AdminUser) => {
    if (!user) return;
    const ok = await confirm({
      title: "Supprimer cet utilisateur ?",
      message: `${target.displayName || target.email || target.uid} sera définitivement supprimé, ainsi que toutes ses données. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      danger: true
    });
    if (!ok) return;

    setDeletingUid(target.uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${target.uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors de la suppression");
      }
      setUsers(prev => prev.filter(u => u.uid !== target.uid));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    } finally {
      setDeletingUid(null);
    }
  };

  const handleToggleAdmin = async (target: AdminUser) => {
    if (!user) return;
    const nextIsAdmin = !target.isAdmin;
    const ok = await confirm({
      title: nextIsAdmin ? "Promouvoir en administrateur ?" : "Retirer les droits administrateur ?",
      message: nextIsAdmin
        ? `${target.displayName || target.email} pourra accéder à cette page d'administration et gérer les utilisateurs.`
        : `${target.displayName || target.email} n'aura plus accès à l'administration.`,
      confirmLabel: nextIsAdmin ? "Promouvoir" : "Retirer",
      danger: !nextIsAdmin
    });
    if (!ok) return;

    setTogglingUid(target.uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${target.uid}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: nextIsAdmin })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors de la mise à jour");
      }
      setUsers(prev => prev.map(u => (u.uid === target.uid ? { ...u, isAdmin: nextIsAdmin } : u)));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setTogglingUid(null);
    }
  };

  const StatusBadge = ({ online }: { online: boolean }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        online
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-gray-400"}`} />
      {online ? "En ligne" : "Hors ligne"}
    </span>
  );

  const SortableHeader = ({ sortableKey, align }: { sortableKey: SortKey; align?: "right" }) => (
    <th className={`px-5 py-3 font-medium ${align === "right" ? "text-right" : ""}`}>
      <button
        onClick={() => handleSort(sortableKey)}
        className={`inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {COLUMN_LABELS[sortableKey]}
        {sortKey === sortableKey ? (
          sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" strokeWidth={2} />
        )}
      </button>
    </th>
  );

  const RoleBadge = ({ u }: { u: AdminUser }) =>
    u.isAdmin ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
        Admin
      </span>
    ) : (
      <span className="text-xs text-gray-500">Utilisateur</span>
    );

  const AdminToggleButton = ({ u }: { u: AdminUser }) => {
    if (u.isEnvAdmin) {
      return (
        <span
          title="Défini via la configuration serveur, non modifiable ici"
          className="inline-flex items-center gap-1.5 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
          Config
        </span>
      );
    }
    return (
      <button
        onClick={() => handleToggleAdmin(u)}
        disabled={togglingUid === u.uid || u.uid === user?.uid}
        title={u.uid === user?.uid ? "Impossible de modifier son propre statut" : undefined}
        className={`inline-flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
          u.isAdmin
            ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
        }`}
      >
        {u.isAdmin ? <ShieldMinus className="w-3.5 h-3.5" strokeWidth={2} /> : <ShieldPlus className="w-3.5 h-3.5" strokeWidth={2} />}
        {u.isAdmin ? "Retirer admin" : "Promouvoir"}
      </button>
    );
  };

  const DeleteButton = ({ u }: { u: AdminUser }) => (
    <button
      onClick={() => handleDelete(u)}
      disabled={deletingUid === u.uid || u.uid === user?.uid}
      title={u.uid === user?.uid ? "Impossible de se supprimer soi-même" : "Supprimer"}
      className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors text-xs font-medium whitespace-nowrap"
    >
      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
      Supprimer
    </button>
  );

  if (!hasAccess) {
    return (
      <StatusPage
        icon={ShieldOff}
        title="Accès refusé"
        message="Tu n'as pas les droits nécessaires pour accéder à cette page."
        actionHref="/dashboard"
        actionLabel="Retour au tableau de bord"
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Administration</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
            {users.length} utilisateur{users.length > 1 ? "s" : ""} inscrit{users.length > 1 ? "s" : ""}
            {initialLoadDone && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Temps réel
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
          Actualiser
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 sm:flex-none">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full sm:max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
        </div>

        {/* Bouton de tri — mobile uniquement : sur desktop, on trie via les en-têtes du tableau */}
        <div className="relative md:hidden">
          <button
            onClick={() => setShowSortMenu(s => !s)}
            className={`flex items-center justify-center gap-2 border rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors shrink-0 ${
              showSortMenu
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            aria-label="Trier"
          >
            <ArrowUpDown className="w-4 h-4" strokeWidth={2} />
          </button>

          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-20">
                {(Object.keys(COLUMN_LABELS) as SortKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      {sortKey === key && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
                      <span className={sortKey === key ? "text-gray-900 dark:text-white font-medium" : ""}>
                        {COLUMN_LABELS[key]}
                      </span>
                    </span>
                    {sortKey === key && (
                      sortDir === "asc"
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" strokeWidth={2} />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-500" strokeWidth={2} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={2} />
          {error}
        </div>
      )}

      {loading && users.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-8 text-center text-gray-500 text-sm">
          Chargement…
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-8 text-center text-gray-500 text-sm">
          Aucun utilisateur trouvé
        </div>
      )}

      {filteredUsers.length > 0 && (
        <>
          {/* Vue tableau — desktop/tablette */}
          <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
                    <SortableHeader sortableKey="name" />
                    <SortableHeader sortableKey="status" />
                    <SortableHeader sortableKey="role" />
                    <SortableHeader sortableKey="createdAt" />
                    <SortableHeader sortableKey="lastSignInTime" />
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                      <td className="px-5 py-3">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {u.displayName || "—"}
                        </div>
                        <div className="text-gray-500 text-xs">{u.email || "—"}</div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge online={isUserOnline(u.lastActiveAt, now)} />
                      </td>
                      <td className="px-5 py-3">
                        <RoleBadge u={u} />
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(u.lastSignInTime)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <AdminToggleButton u={u} />
                          <DeleteButton u={u} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map(u => (
              <div
                key={u.uid}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-gray-900 dark:text-white font-medium truncate">
                      {u.displayName || "—"}
                    </div>
                    <div className="text-gray-500 text-xs truncate">{u.email || "—"}</div>
                  </div>
                  <StatusBadge online={isUserOnline(u.lastActiveAt, now)} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <div className="text-gray-500 mb-0.5">Inscription</div>
                    <div className="text-gray-700 dark:text-gray-300">{formatDateTime(u.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-0.5">Dernière connexion</div>
                    <div className="text-gray-700 dark:text-gray-300">{formatDateTime(u.lastSignInTime)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <RoleBadge u={u} />
                  <div className="flex items-center gap-1">
                    <AdminToggleButton u={u} />
                    <DeleteButton u={u} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
