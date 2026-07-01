#!/bin/bash
set -e

echo "🧹 Nettoyage du cache Next.js et node_modules..."
rm -rf .next node_modules

echo "🧹 Nettoyage du cache npm..."
npm cache clean --force

echo "📦 Réinstallation des dépendances..."
npm install

echo "🚀 Lancement du serveur dev..."
npm run dev