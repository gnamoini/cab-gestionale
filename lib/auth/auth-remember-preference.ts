import { AUTH_PERSISTENT_COOKIE_MAX_AGE } from "@/lib/auth/auth-cookie-options";

export const CAB_AUTH_REMEMBER_COOKIE_KEY = "cab-auth-remember";
/** Mirror opzionale per compat; non usato come SSOT di lettura. */
export const CAB_AUTH_REMEMBER_STORAGE_KEY = "cab-auth-remember";

type CookieLike = { name: string; value: string };

function parseRememberCookieValue(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

function readRememberFromCookieChunks(chunks: Iterable<string>): boolean | null {
  for (const chunk of chunks) {
    if (!chunk) continue;
    const eq = chunk.indexOf("=");
    if (eq < 0) continue;
    const name = decodeURIComponent(chunk.slice(0, eq));
    if (name !== CAB_AUTH_REMEMBER_COOKIE_KEY) continue;
    return parseRememberCookieValue(decodeURIComponent(chunk.slice(eq + 1)));
  }
  return null;
}

/** SSOT server-side: solo cookie `cab-auth-remember`; default session-only (false). */
export function readAuthRememberPreferenceFromCookies(cookies: CookieLike[]): boolean {
  const entry = cookies.find((c) => c.name === CAB_AUTH_REMEMBER_COOKIE_KEY);
  const parsed = parseRememberCookieValue(entry?.value);
  return parsed ?? false;
}

/**
 * SSOT client-side: solo cookie. Se manca, migrazione one-shot da localStorage legacy → cookie.
 * Default session-only (false) = opt-in esplicito per persistenza.
 */
export function readAuthRememberPreference(): boolean {
  if (typeof window === "undefined") return false;

  const fromCookie = readRememberFromCookieChunks(document.cookie.split("; "));
  if (fromCookie !== null) return fromCookie;

  try {
    const stored = localStorage.getItem(CAB_AUTH_REMEMBER_STORAGE_KEY);
    if (stored === "0" || stored === "1") {
      const remember = stored === "1";
      setAuthRememberPreference(remember);
      return remember;
    }
  } catch {
    /* storage disabilitato */
  }

  return false;
}

/** Salva preferenza: cookie SSOT + mirror localStorage best-effort. */
export function setAuthRememberPreference(remember: boolean): void {
  if (typeof window === "undefined") return;

  const value = remember ? "1" : "0";
  try {
    localStorage.setItem(CAB_AUTH_REMEMBER_STORAGE_KEY, value);
  } catch {
    /* storage disabilitato */
  }

  const maxAgePart = remember ? `;max-age=${AUTH_PERSISTENT_COOKIE_MAX_AGE}` : "";
  const securePart = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${CAB_AUTH_REMEMBER_COOKIE_KEY}=${value};path=/;SameSite=Lax${maxAgePart}${securePart}`;
}
