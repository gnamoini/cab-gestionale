import { AUTH_PERSISTENT_COOKIE_MAX_AGE } from "@/lib/auth/auth-cookie-options";

export const CAB_AUTH_REMEMBER_COOKIE_KEY = "cab-auth-remember";
export const CAB_AUTH_REMEMBER_STORAGE_KEY = "cab-auth-remember";

type CookieLike = { name: string; value: string };

export function readAuthRememberPreferenceFromCookies(cookies: CookieLike[]): boolean {
  const entry = cookies.find((c) => c.name === CAB_AUTH_REMEMBER_COOKIE_KEY);
  if (!entry) return true;
  return entry.value === "1";
}

export function readAuthRememberPreference(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const stored = localStorage.getItem(CAB_AUTH_REMEMBER_STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
  } catch {
    /* storage disabilitato */
  }

  const chunks = document.cookie.split("; ");
  for (const chunk of chunks) {
    if (!chunk) continue;
    const eq = chunk.indexOf("=");
    if (eq < 0) continue;
    const name = decodeURIComponent(chunk.slice(0, eq));
    if (name !== CAB_AUTH_REMEMBER_COOKIE_KEY) continue;
    return decodeURIComponent(chunk.slice(eq + 1)) === "1";
  }

  return true;
}

/** Salva preferenza prima del login — cookie + localStorage per ripopolare il form. */
export function setAuthRememberPreference(remember: boolean): void {
  if (typeof window === "undefined") return;

  const value = remember ? "1" : "0";
  try {
    localStorage.setItem(CAB_AUTH_REMEMBER_STORAGE_KEY, value);
  } catch {
    /* storage disabilitato */
  }

  const maxAgePart = remember ? `;max-age=${AUTH_PERSISTENT_COOKIE_MAX_AGE}` : "";
  document.cookie = `${CAB_AUTH_REMEMBER_COOKIE_KEY}=${value};path=/;SameSite=Lax${maxAgePart}`;
}
