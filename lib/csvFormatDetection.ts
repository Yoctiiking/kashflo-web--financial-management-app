// Détection et parsing tolérants des dates et montants d'un import CSV/Excel — le
// format exact (séparateurs, ordre jour/mois, virgule ou point décimal...) varie selon
// la banque de chaque utilisateur et n'est jamais connu à l'avance.

export type DateFormatId = "iso" | "dmy" | "mdy" | "dmy-dash" | "textMonth";

export const DATE_FORMAT_IDS: DateFormatId[] = ["iso", "dmy", "mdy", "dmy-dash", "textMonth"];

const normalizeToken = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\.$/, "");

const MONTH_NAMES: Record<string, number> = {
  jan: 0, janv: 0, janvier: 0, january: 0,
  fev: 1, fevr: 1, fevrier: 1, feb: 1, february: 1,
  mar: 2, mars: 2, march: 2,
  avr: 3, avril: 3, apr: 3, april: 3,
  mai: 4, may: 4,
  juin: 5, jun: 5, june: 5,
  juil: 6, juillet: 6, jul: 6, july: 6,
  aou: 7, aout: 7, aug: 7, august: 7,
  sep: 8, sept: 8, septembre: 8, september: 8,
  oct: 9, octobre: 9, october: 9,
  nov: 10, novembre: 10, november: 10,
  dec: 11, decembre: 11, december: 11
};

const parseMonthToken = (token: string): number | null => {
  const norm = normalizeToken(token);
  if (norm in MONTH_NAMES) return MONTH_NAMES[norm];
  return null;
};

const parseIsoDate = (s: string): Date | null => {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(date.getTime()) ? null : date;
};

const parseSlashDate = (s: string, dayFirst: boolean): Date | null => {
  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  const [day, month] = dayFirst ? [a, b] : [b, a];
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const date = new Date(y, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

const parseDashDate = (s: string): Date | null => {
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day > 31 || month > 12) return null;
  const date = new Date(Number(m[3]), month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

const parseTextMonthDate = (s: string): Date | null => {
  // "31 déc 2025" / "31 décembre 2025"
  let m = s.match(/^(\d{1,2})\s+([a-zà-ÿ]+)\.?\s+(\d{4})/i);
  if (m) {
    const month = parseMonthToken(m[2]);
    if (month === null) return null;
    const date = new Date(Number(m[3]), month, Number(m[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  // "Dec 31, 2025" / "December 31 2025"
  m = s.match(/^([a-zà-ÿ]+)\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const month = parseMonthToken(m[1]);
    if (month === null) return null;
    const date = new Date(Number(m[3]), month, Number(m[2]));
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const parseDateWithFormat = (raw: string, formatId: DateFormatId): Date | null => {
  const s = raw.trim();
  if (!s) return null;
  switch (formatId) {
    case "iso": return parseIsoDate(s);
    case "dmy": return parseSlashDate(s, true);
    case "mdy": return parseSlashDate(s, false);
    case "dmy-dash": return parseDashDate(s);
    case "textMonth": return parseTextMonthDate(s);
  }
};

// Départage jour/mois-premier sur des dates séparées par "/" ou "." : si un échantillon
// prouve qu'une position dépasse 12 (donc ne peut être un mois), le format est déterminé
// sans ambiguïté. Sinon (tous les jours ≤ 12), on retombe sur jour/mois/année (JJ/MM/AAAA,
// convention majoritaire chez les utilisateurs francophones de l'app).
const detectSlashFormat = (samples: string[]): "dmy" | "mdy" | null => {
  let dmyProven = false;
  let mdyProven = false;

  for (const s of samples) {
    const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 31 || b > 31) return null;
    if (a > 12 && b > 12) return null;
    if (a > 12) dmyProven = true;
    if (b > 12) mdyProven = true;
  }

  if (dmyProven && !mdyProven) return "dmy";
  if (mdyProven && !dmyProven) return "mdy";
  return "dmy"; // ambigu (tous les jours ≤ 12) → biais JJ/MM/AAAA
};

// Essaie chaque format candidat sur l'échantillon fourni ; retient le premier qui parse
// TOUTES les valeurs sans erreur. Retourne null si aucun format ne convient partout —
// l'utilisateur devra alors choisir manuellement dans le <select> de correction.
export const detectDateFormat = (samples: string[]): DateFormatId | null => {
  const values = samples.map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return null;

  if (values.every((s) => /^\d{4}-\d{1,2}-\d{1,2}/.test(s))) return "iso";

  if (values.every((s) => /^\d{1,2}[/.]\d{1,2}[/.]\d{4}/.test(s))) {
    return detectSlashFormat(values);
  }

  if (values.every((s) => /^\d{1,2}-\d{1,2}-\d{4}/.test(s))) return "dmy-dash";

  if (values.every((s) => parseTextMonthDate(s) !== null)) return "textMonth";

  return null;
};

const CURRENCY_TOKENS = /\$|€|£|¥|CAD|USD|EUR|GBP|CHF|XOF|FCFA/gi;

// Tolère : virgule ou point décimal, espaces/virgules comme séparateur de milliers,
// parenthèses comptables "(123,45)" pour les montants négatifs, symboles de devise.
export const parseAmount = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const negative = /^\(.*\)$/.test(trimmed) || trimmed.includes("-");

  let s = trimmed
    .replace(/[()]/g, "")
    .replace(CURRENCY_TOKENS, "")
    .replace(/[^\d.,]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  }

  const value = parseFloat(s);
  if (isNaN(value)) return null;
  return negative ? -Math.abs(value) : Math.abs(value);
};
