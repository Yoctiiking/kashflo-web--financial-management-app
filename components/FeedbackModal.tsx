"use client";

import { useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { saveFeedback } from "@/lib/firebase/firestore";

interface Props {
    onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
    const { user } = useAuth();
    const [name, setName] = useState(user?.displayName || "");
    const [email, setEmail] = useState(user?.email || "");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email || !message) {
            setError("Tous les champs sont obligatoires");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await saveFeedback({ name, email, message, userId: user?.uid });

            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message, userId: user?.uid })
            });

            if (!res.ok) {
                const data = await res.json();
                console.error("Erreur envoi email:", data);
                // On ne bloque pas l'utilisateur — le feedback est sauvegardé même si l'email échoue
            }

            setSuccess(true);
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            console.error(err);
            setError("Erreur lors de l'envoi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h2 className="text-white font-semibold text-lg">Nous contacter</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="text-emerald-400 font-medium">Message envoyé !</p>
                            <p className="text-gray-500 text-sm mt-1">Merci pour ton retour</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-400 text-sm">
                                Une question, un bug, ou une suggestion ? Écris-nous, on te répond rapidement.
                            </p>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Nom</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="Ton nom"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="ton@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                    placeholder="Décris ton problème ou ta suggestion..."
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                {loading ? "Envoi..." : "Envoyer"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}