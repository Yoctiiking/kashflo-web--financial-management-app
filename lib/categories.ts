// Valeurs de départ copiées dans le profil de chaque nouvel utilisateur.
// Une fois créées, les catégories vivent dans users/{uid}.expenseCategories
// et .incomeCategories — cette liste ne sert plus que de valeur initiale
// et de repli si le champ est absent (comptes créés avant cette fonctionnalité).
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Alimentation",
  "Transport",
  "Logement",
  "Santé",
  "Loisirs",
  "Vêtements",
  "Abonnements",
  "Restaurants",
  "Éducation",
  "Autre"
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Salaire",
  "Freelance",
  "Investissements",
  "Remboursement",
  "Autre"
];
