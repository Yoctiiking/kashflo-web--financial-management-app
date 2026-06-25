"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/AuthProvider";
import { getInvite, useInvite, getGroup } from "@/lib/firebase/firestore";
import { Group } from "@/types";
import Link from "next/link";

type Status = "loading" | "valid" | "expired" | "used" | "invalid" | "joining" | "success" | "error";

export default function JoinPage() {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [status, setStatus] = useState<Status>("loading");
    const [group, setGroup] = useState<Group | null>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    // On stocke le groupId dans l'URL — format : /join/[groupId]--[code]
    // Exemple : /join/group_abc123--xK9mP2qR4t
    useEffect(() => {
        if (authLoading) return;

        // const loadInvite = async () => {
        //   try {
        //     // Le code contient groupId--inviteCode
        //     const [gId, inviteCode] = code.split("--");
        //     if (!gId || !inviteCode) {
        //       setStatus("invalid");
        //       return;
        //     }

        //     setGroupId(gId);

        //     const invite = await getInvite(gId, inviteCode);
        //     if (!invite) {
        //       setStatus("invalid");
        //       return;
        //     }

        //     if (invite.expiresAt < new Date()) {
        //       setStatus("expired");
        //       return;
        //     }

        //     if (!invite.multipleUse && invite.usedCount >= 1) {
        //       setStatus("used");
        //       return;
        //     }

        //     const groupData = await getGroup(gId);
        //     setGroup(groupData);
        //     setStatus("valid");
        //   } catch (err) {
        //     console.error(err);
        //     setStatus("invalid");
        //   }
        // };

        const loadInvite = async () => {
            try {
                const [gId, inviteCode] = code.split("--");
                if (!gId || !inviteCode) {
                    setStatus("invalid");
                    return;
                }

                setGroupId(gId);

                const invite = await getInvite(gId, inviteCode);
                if (!invite) {
                    setStatus("invalid");
                    return;
                }

                if (invite.expiresAt < new Date()) {
                    setStatus("expired");
                    return;
                }

                if (!invite.multipleUse && invite.usedCount >= 1) {
                    setStatus("used");
                    return;
                }

                // Plus besoin de getGroup — on utilise invite.groupName
                setGroup({ name: invite.groupName } as any);
                setStatus("valid");
            } catch (err) {
                console.error("❌ Erreur exacte:", err);
                setStatus("invalid");
            }
        };

        loadInvite();
    }, [code, authLoading]);

    const handleJoin = async () => {
        if (!user || !groupId) return;
        const [gId, inviteCode] = code.split("--");
        setStatus("joining");

        const result = await useInvite(gId, inviteCode, user.uid);

        if (result.success) {
            setStatus("success");
            setTimeout(() => router.push("/dashboard"), 2000);
        } else {
            setStatus("error");
            setErrorMessage(result.error || "Une erreur est survenue");
        }
    };

    // États de l'UI
    const states: Record<Status, { icon: string; title: string; message: string; action?: React.ReactNode }> = {
        loading: {
            icon: "⏳",
            title: "Vérification...",
            message: "On vérifie ton invitation"
        },
        invalid: {
            icon: "❌",
            title: "Lien invalide",
            message: "Ce lien d'invitation n'existe pas ou a été supprimé"
        },
        expired: {
            icon: "⏰",
            title: "Lien expiré",
            message: "Ce lien d'invitation a expiré. Demande un nouveau lien à l'admin du groupe"
        },
        used: {
            icon: "🔒",
            title: "Lien déjà utilisé",
            message: "Ce lien d'invitation à usage unique a déjà été utilisé"
        },
        valid: {
            icon: "👥",
            title: `Rejoindre ${group?.name || "le groupe"}`,
            message: user
                ? `Tu es invité à rejoindre ce groupe partagé`
                : `Connecte-toi ou crée un compte pour rejoindre ce groupe`,
            action: user ? (
                <button
                    onClick={handleJoin}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors mt-4"
                >
                    Rejoindre le groupe
                </button>
            ) : (
                <div className="flex flex-col gap-2 mt-4">
                    <Link
                        href={`/login?redirect=/join/${code}`}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors text-center"
                    >
                        Se connecter
                    </Link>
                    <Link
                        href={`/register?redirect=/join/${code}`}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors text-center"
                    >
                        Créer un compte
                    </Link>
                </div>
            )
        },
        joining: {
            icon: "⏳",
            title: "Rejoindre...",
            message: "On t'ajoute au groupe"
        },
        success: {
            icon: "✅",
            title: "Bienvenue !",
            message: "Tu as rejoint le groupe. Redirection en cours..."
        },
        error: {
            icon: "❌",
            title: "Erreur",
            message: errorMessage
        }
    };

    const current = states[status];

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        Kash<span className="text-emerald-500">Flo</span>
                    </h1>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-4">{current.icon}</div>
                    <h2 className="text-white font-semibold text-xl mb-2">{current.title}</h2>
                    <p className="text-gray-400 text-sm">{current.message}</p>
                    {current.action}
                </div>
            </div>
        </div>
    );
}