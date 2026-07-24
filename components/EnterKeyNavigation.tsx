"use client";

import { useEffect } from "react";

const FOCUSABLE_SELECTOR = "input, select, textarea";
const SKIP_INPUT_TYPES = ["submit", "button", "checkbox", "radio", "file", "reset", "range"];

const isVisible = (el: HTMLElement) => el.offsetParent !== null;

/**
 * Rend le fonctionnement de "Entrée" cohérent avec Tab sur tous les formulaires
 * et modales de l'app : passe au champ suivant au lieu de ne rien faire ou de
 * soumettre prématurément.
 */
export default function EnterKeyNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;

      const target = e.target;
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;
      if (target instanceof HTMLInputElement && SKIP_INPUT_TYPES.includes(target.type)) return;

      const scope = target.closest(".fixed.inset-0") ?? target.closest("form") ?? document.body;
      const focusable = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && isVisible(el)
      );

      const index = focusable.indexOf(target);
      if (index === -1) return;

      const next = focusable[index + 1];
      if (!next) return;

      e.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
        next.select();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
