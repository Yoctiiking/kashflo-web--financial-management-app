"use client";

import { useEffect } from "react";

const isVisible = (el: HTMLElement) => el.offsetParent !== null;

/**
 * Ferme/annule la modale au premier plan avec Échap, en cliquant son bouton
 * de fermeture (icône X) ou son bouton "Annuler" pour les modales sans icône
 * X (marquées data-escape-cancel, ex. ConfirmModal, DeleteExpenseModal).
 * Les écrans sans bouton de fermeture (verrouillage PIN, onboarding) ne
 * matchent aucun sélecteur et restent donc non fermables par Échap.
 */
export default function EscapeKeyClose() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const overlays = Array.from(document.querySelectorAll<HTMLElement>(".fixed.inset-0")).filter(isVisible);
      if (overlays.length === 0) return;

      const topmost = overlays.reduce<HTMLElement | null>((top, el) => {
        const z = parseInt(getComputedStyle(el).zIndex) || 0;
        const topZ = top ? parseInt(getComputedStyle(top).zIndex) || 0 : -1;
        return z >= topZ ? el : top;
      }, null);

      const closeButton = topmost?.querySelector<HTMLButtonElement>(
        "button:has(svg.lucide-x), [data-escape-cancel]"
      );
      if (!closeButton) return;

      e.preventDefault();
      closeButton.click();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
