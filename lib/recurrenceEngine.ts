import { Recurrence, RecurrenceFrequency } from "@/types";
import { addTransaction, updateRecurrenceNextOccurrence } from "./firebase/firestore";
import { Timestamp } from "firebase/firestore";

// Calcule la prochaine date selon la fréquence
export const getNextOccurrence = (date: Date, frequency: RecurrenceFrequency, customDays?: number): Date => {
  const next = new Date(date);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      next.setDate(next.getDate() + (customDays ?? 1));
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }

  return next;
};

// Génère toutes les transactions manquantes pour une récurrence
export const processRecurrence = async (
  groupId: string,
  recurrence: Recurrence,
  addedBy: string
) => {
  if (!recurrence.isActive) return;

  const today = new Date();
  today.setHours(23, 59, 59, 999); // fin de journée

  let nextOccurrence = new Date(recurrence.nextOccurrence);

  // Génère toutes les transactions manquantes
  while (nextOccurrence <= today) {
    await addTransaction(groupId, {
      amount: recurrence.amount,
      type: recurrence.type,
      category: recurrence.category,
      label: recurrence.label,
      date: nextOccurrence,
      addedBy,
      recurrenceId: recurrence.id
    });

    nextOccurrence = getNextOccurrence(nextOccurrence, recurrence.frequency, recurrence.customDays);
  }

  // Met à jour nextOccurrence dans Firestore
  await updateRecurrenceNextOccurrence(groupId, recurrence.id, nextOccurrence);
};

// Traite toutes les récurrences d'un groupe
export const processAllRecurrences = async (
  groupId: string,
  recurrences: Recurrence[],
  addedBy: string
) => {
  const pending = recurrences.filter(r => r.isActive && r.nextOccurrence <= new Date());
  await Promise.all(pending.map(r => processRecurrence(groupId, r, addedBy)));
  return pending.length; // retourne le nombre de transactions générées
};