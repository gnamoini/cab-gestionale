import {
  DEFAULT_PERSISTED_THEME_MODE,
  type PersistedThemeMode,
} from "@/lib/theme/user-theme-prefs";

/** Chiave localStorage — cache di boot (allineata a DB `user_prefs` quando autenticato). */
export const CAB_THEME_STORAGE_KEY = "cab-theme";

/** Migrazione one-shot: reset preferenza locale al default globale dark. */
export const CAB_THEME_CLIENT_MIGRATION_KEY = "cab-theme-default-dark-v1";

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

/** Reset locale one-shot verso default dark (tutti i browser esistenti). */
export function runThemeClientMigrationToDefault(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(CAB_THEME_CLIENT_MIGRATION_KEY) === "1") return;
    localStorage.setItem(CAB_THEME_STORAGE_KEY, DEFAULT_PERSISTED_THEME_MODE);
    localStorage.setItem(CAB_THEME_CLIENT_MIGRATION_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Tema boot: cache locale valida oppure default globale (mai preferenza OS). */
export function resolveBootThemeMode(): PersistedThemeMode {
  runThemeClientMigrationToDefault();
  return readThemeBootCache() ?? DEFAULT_PERSISTED_THEME_MODE;
}
