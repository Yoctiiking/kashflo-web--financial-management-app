import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    allowedDevOrigins: ['192.168.2.114'],
    // firebase-admin est déjà exclu du bundling par défaut par Next.js, mais pas ses
    // dépendances transitives (@google-cloud/firestore -> google-gax -> gRPC), qui
    // embarquent des bindings natifs et des fichiers .proto chargés dynamiquement.
    // Sans ça, le traceur de fichiers de Vercel peut les omettre du bundle serverless
    // et faire planter la fonction au premier appel Firestore, en production
    // uniquement (le build local n'est pas affecté car node_modules est complet).
    serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "google-gax"],
};

export default nextConfig;