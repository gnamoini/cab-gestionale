import type { PersistedThemeMode } from "@/lib/theme/user-theme-prefs";

/** Chiave localStorage — cache di boot (non source of truth; DB `user_prefs`). */
export const CAB_THEME_STORAGE_KEY = "cab-theme";

/** Applica tema al documento (condiviso con ThemeProvider). */
export function applyPersistedThemeToDocument(mode: PersistedThemeMode): void {
  if (typeof document === "undefined") return;
  const isDark = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function readThemeBootCache(): PersistedThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CAB_THEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeThemeBootCache(mode: PersistedThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAB_THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Tema iniziale prima del fetch DB (cache utente o preferenza OS). */
export function resolveBootThemeMode(): PersistedThemeMode {
  return readThemeBootCache() ?? (systemPrefersDark() ? "dark" : "light");
}
