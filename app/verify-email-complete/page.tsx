"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailCompletePage() {
  const [closeFailed, setCloseFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.close();
      // Si on arrive ici après le délai, la fermeture a échoué
      setTimeout(() => setCloseFailed(true), 300);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-white mb-6">
          Kash<span className="text-emerald-500">Flo</span>
        </h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-white font-semibold text-xl mb-2">Email vérifié !</h2>
          {!closeFailed ? (
            <p className="text-gray-400 text-sm">Fermeture de cette fenêtre...</p>
          ) : (
            <p className="text-gray-400 text-sm">
              Tu peux fermer cet onglet et retourner sur Kash Flo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}