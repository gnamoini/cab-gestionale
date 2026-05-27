/** Regole nome utente login (allineate a `profiles_username_format`). */
export const USERNAME_MIN_LEN = 3;
export const USERNAME_MAX_LEN = 32;

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginIdentifierKind = "email" | "username" | "empty" | "invalid";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Sanitizza input username (minuscolo, solo caratteri ammessi, max lunghezza). */
export function sanitizeUsernameInput(raw: string): string {
  return normalizeUsername(raw)
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, USERNAME_MAX_LEN);
}

export function isValidUsernameFormat(raw: string): boolean {
  const u = normalizeUsername(raw);
  if (u.length < USERNAME_MIN_LEN || u.length > USERNAME_MAX_LEN) return false;
  return USERNAME_RE.test(u);
}

export function isValidEmailFormat(value: string): boolean {
  const s = value.trim().toLowerCase();
  if (!s) return false;
  return EMAIL_RE.test(s);
}

export function classifyLoginIdentifier(value: string): LoginIdentifierKind {
  const s = value.trim();
  if (!s) return "empty";
  if (s.includes("@")) return isValidEmailFormat(s) ? "email" : "invalid";
  return isValidUsernameFormat(s) ? "username" : "invalid";
}

/** Email completa oppure nome utente (senza @). */
export function isValidLoginIdentifier(value: string): boolean {
  const kind = classifyLoginIdentifier(value);
  return kind === "email" || kind === "username";
}

/** Messaggio errore campo login (null = valido). */
export function loginIdentifierFieldError(value: string): string | null {
  const kind = classifyLoginIdentifier(value);
  switch (kind) {
    case "empty":
      return "Inserisci email o nome utente.";
    case "email":
      return null;
    case "username":
      return null;
    case "invalid":
      if (value.trim().includes("@")) return "Indirizzo email non valido.";
      return "Nome utente non valido (3–32 caratteri: lettere minuscole, numeri, . _ -).";
  }
}

/** Messaggio errore form creazione utente (username). */
export function usernameFieldError(value: string): string | null {
  const u = normalizeUsername(value);
  if (!u) return "Il nome utente è obbligatorio.";
  if (!isValidUsernameFormat(u)) {
    return "Nome utente non valido (3–32 caratteri: lettere minuscole, numeri, . _ -).";
  }
  return null;
}

/** Normalizza input login: email lowercase o username sanitizzato. */
export function formatLoginIdentifierInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return sanitizeUsernameInput(trimmed);
}
