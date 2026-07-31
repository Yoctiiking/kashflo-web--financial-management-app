// Dictionnaire de mots-clés pour la détection automatique du mapping colonnes → champs
// Kash Flo à l'import CSV/Excel. Ajoute de nouveaux mots-clés ici pour couvrir d'autres
// formats d'export bancaire — aucune autre modification n'est nécessaire ailleurs.

export type CsvField = "date" | "label" | "amount" | "category" | "debit" | "credit";

export const CSV_FIELD_KEYWORDS: Record<CsvField, string[]> = {
  date: ["date", "date operation", "date de transaction", "transaction date", "posted date"],
  label: ["libelle", "description", "details", "memo", "label", "narration"],
  amount: ["montant", "amount", "valeur", "value"],
  debit: ["debit"],
  credit: ["credit"],
  category: ["categorie", "category", "type de depense"]
};

// Ordre de résolution : un en-tête déjà assigné à un champ prioritaire ne peut plus
// matcher un champ suivant (évite qu'une même colonne serve deux fois).
const FIELD_PRIORITY: CsvField[] = ["date", "label", "amount", "debit", "credit", "category"];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function detectColumnMapping(headers: string[]): Partial<Record<CsvField, string>> {
  const candidates = headers.map((raw) => ({ raw, norm: normalize(raw) }));
  const result: Partial<Record<CsvField, string>> = {};
  const used = new Set<string>();

  for (const field of FIELD_PRIORITY) {
    const keywords = CSV_FIELD_KEYWORDS[field];

    // Correspondance exacte d'abord (en-tête == mot-clé une fois normalisé)
    let match = candidates.find((c) => !used.has(c.raw) && keywords.includes(c.norm));
    // Sinon, correspondance partielle (le mot-clé apparaît dans l'en-tête)
    if (!match) {
      match = candidates.find((c) => !used.has(c.raw) && keywords.some((k) => c.norm.includes(k)));
    }

    if (match) {
      result[field] = match.raw;
      used.add(match.raw);
    }
  }

  return result;
}

// Signature stable d'un jeu de colonnes, utilisée comme identifiant de template de
// mapping sauvegardé (users/{uid}/importTemplates/{signature}). Basée sur les en-têtes
// triés et normalisés : l'ordre des colonnes dans le fichier n'a pas d'importance.
export function computeColumnsSignature(columns: string[]): string {
  const joined = columns.map(normalize).sort().join("|");
  let hash = 0;
  for (let i = 0; i < joined.length; i++) {
    hash = (hash << 5) - hash + joined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
