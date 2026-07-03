const PIN_KEY = "kashflo_pin_data";
const LAST_ACTIVE_KEY = "kashflo_last_active";
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes d'inactivité

async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt(): string {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function setPin(pin: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash }));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  const { salt, hash } = JSON.parse(stored);
  const attemptHash = await hashPin(pin, salt);
  return attemptHash === hash;
}

export function hasPinSet(): boolean {
  return localStorage.getItem(PIN_KEY) !== null;
}

export function removePin(): void {
  localStorage.removeItem(PIN_KEY);
}

export function updateLastActive(): void {
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export function isLockedOut(): boolean {
  if (!hasPinSet()) return false;
  const last = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!last) return true;
  const elapsed = Date.now() - parseInt(last);
  return elapsed > LOCK_TIMEOUT_MS;
}