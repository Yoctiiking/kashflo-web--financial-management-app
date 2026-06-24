"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import {
  getUserProfile,
  getGroup,
  getGroupInvites,
  createInvite,
  deleteInvite,
  removeMemberFromGroup,
  updateGroupName,
  Invite
} from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { Group, UserProfile } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface MemberInfo {
  uid: string;
  displayName: string;
  email: string;
}

const EXPIRY_OPTIONS = [
  { label: "15 minutes", minutes: 15 },
  { label: "1 heure", minutes: 60 },
  { label: "6 heures", minutes: 360 },
  { label: "24 heures", minutes: 1440 },
  { label: "2 jours", minutes: 2880 }
];

export default function GroupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Création d'invitation
  const [expiryMinutes, setExpiryMinutes] = useState(1440);
  const [multipleUse, setMultipleUse] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const userProfile = await getUserProfile(user.uid);
      if (!userProfile) return;
      setProfile(userProfile);

      const groupData = await getGroup(userProfile.groupId);
      if (!groupData) return;
      setGroup(groupData);
      setGroupName(groupData.name);

      const memberInfos = await Promise.all(
        groupData.members.map(async (uid: string) => {
          const memberProfile = await getUserProfile(uid);
          return memberProfile
            ? { uid, displayName: memberProfile.displayName, email: memberProfile.email }
            : null;
        })
      );
      setMembers(memberInfos.filter(Boolean) as MemberInfo[]);

      const groupInvites = await getGroupInvites(userProfile.groupId);
      setInvites(groupInvites);
    } catch (err: any) {
      if (err?.code === "permission-denied") {
        // L'utilisateur a été retiré du groupe — recharger depuis le début
        router.refresh();
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvite = async () => {
    if (!profile || !user) return;
    setCreatingInvite(true);
    try {
      const code = await createInvite(profile.groupId, user.uid, expiryMinutes, multipleUse);
      await loadData();
      // Copie automatiquement le lien
      const link = `${window.location.origin}/join/${profile.groupId}--${code}`;
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyLink = async (code: string) => {
    if (!profile) return;
    const link = `${window.location.origin}/join/${profile.groupId}--${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleDeleteInvite = async (code: string) => {
    if (!profile) return;
    await deleteInvite(profile.groupId, code);
    await loadData();
  };

  const handleRemoveMember = async (uid: string) => {
    if (!profile) return;
    await removeMemberFromGroup(profile.groupId, uid);
    await loadData();
  };

  const handleUpdateName = async () => {
    if (!profile || !groupName.trim()) return;
    await updateGroupName(profile.groupId, groupName.trim());
    setEditingName(false);
    await loadData();
  };

  const isAdmin = group?.createdBy === user?.uid;

  const isExpired = (invite: Invite) => invite.expiresAt < new Date();
  const isUsed = (invite: Invite) => !invite.multipleUse && invite.usedCount >= 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Groupe</h2>
        <p className="text-gray-400 mt-1 text-sm">{members.length} membre{members.length > 1 ? "s" : ""}</p>
      </div>

      {/* Nom du groupe */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-gray-400 text-sm">Nom du groupe</p>
          {isAdmin && (
            <button
              onClick={() => setEditingName(!editingName)}
              className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors"
            >
              {editingName ? "Annuler" : "Modifier"}
            </button>
          )}
        </div>
        {editingName ? (
          <div className="flex gap-2 mt-2">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={handleUpdateName}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
            >
              Sauvegarder
            </button>
          </div>
        ) : (
          <p className="text-white font-semibold text-lg mt-1">{group?.name}</p>
        )}
      </div>

      {/* Membres */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Membres</h3>
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.uid} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {member.displayName}
                    {member.uid === group?.createdBy && (
                      <span className="ml-2 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs">{member.email}</p>
                </div>
              </div>
              {isAdmin && member.uid !== user?.uid && (
                <button
                  onClick={() => handleRemoveMember(member.uid)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Créer une invitation */}
      {isAdmin && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Créer un lien d'invitation</h3>

          <div className="space-y-4">
            {/* Expiration */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Expiration</label>
              <div className="flex flex-wrap gap-2">
                {EXPIRY_OPTIONS.map(option => (
                  <button
                    key={option.minutes}
                    onClick={() => setExpiryMinutes(option.minutes)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${expiryMinutes === option.minutes
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gray-800 text-gray-400 hover:text-white border border-transparent"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Usage</label>
              <div className="flex bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setMultipleUse(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!multipleUse
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-gray-400 hover:text-white"
                    }`}
                >
                  🔒 Usage unique
                </button>
                <button
                  onClick={() => setMultipleUse(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${multipleUse
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-gray-400 hover:text-white"
                    }`}
                >
                  ♾️ Usages multiples
                </button>
              </div>
            </div>

            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {creatingInvite ? "Création..." : "Générer et copier le lien"}
            </button>

            {copiedCode && (
              <p className="text-emerald-400 text-sm text-center">
                ✅ Lien copié dans le presse-papier
              </p>
            )}
          </div>
        </div>
      )}

      {/* Liens actifs */}
      {isAdmin && invites.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Liens d'invitation</h3>
          <div className="space-y-3">
            {invites.map(invite => {
              const expired = isExpired(invite);
              const used = isUsed(invite);
              const inactive = expired || used;

              return (
                <div
                  key={invite.code}
                  className={`flex items-center justify-between p-3 rounded-xl border ${inactive
                      ? "border-gray-800 bg-gray-800/30"
                      : "border-gray-700 bg-gray-800/50"
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-mono ${inactive ? "text-gray-600" : "text-gray-300"}`}>
                        {invite.code}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? "bg-red-500/10 text-red-400" :
                          used ? "bg-gray-700 text-gray-500" :
                            "bg-emerald-500/10 text-emerald-400"
                        }`}>
                        {expired ? "Expiré" : used ? "Utilisé" : "Actif"}
                      </span>
                      {invite.multipleUse && !inactive && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                          ♾️ {invite.usedCount} utilisé{invite.usedCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {expired
                        ? `Expiré ${formatDistanceToNow(invite.expiresAt, { locale: fr, addSuffix: true })}`
                        : `Expire ${formatDistanceToNow(invite.expiresAt, { locale: fr, addSuffix: true })}`
                      }
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!inactive && (
                      <button
                        onClick={() => handleCopyLink(invite.code)}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {copiedCode === invite.code ? "✅" : "📋"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvite(invite.code)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}