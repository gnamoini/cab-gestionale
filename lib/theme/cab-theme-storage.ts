import {
  DEFAULT_PERSISTED_THEME_MODE,
  parsePersistedThemeMode,
  type PersistedThemeMode,
} from "@/lib/theme/user-theme-prefs";

/** Chiave localStorage / cookie — cache di boot (allineata a DB `user_prefs` quando autenticato). */
export const CAB_THEME_STORAGE_KEY = "cab-theme";

/** Migrazione one-shot: reset preferenza locale al default globale dark. */
export const CAB_THEME_CLIENT_MIGRATION_KEY = "cab-theme-default-dark-v1";

/** Max-Age cookie tema (1 anno). */
export const CAB_THEME_COOKIE_MAX_AGE = 31_536_000;

/** Sfondo app per CSS critico inline (primo paint, prima di globals.css). */
export const THEME_CRITICAL_BG: Record<PersistedThemeMode, string> = {
  dark: "#09090b",
  light: "#f4f4f5",
};

/** Tema SSR da cookie (fallback default globale dark). */
export function resolveServerThemeMode(cookieValue: string | undefined | null): PersistedThemeMode {
  return parsePersistedThemeMode(cookieValue) ?? DEFAULT_PERSISTED_THEME_MODE;
}

/** Applica tema al documento (condiviso con ThemeProvider). */
export function applyPersistedThemeToDocument(mode: PersistedThemeMode): void {
  if (typeof document === "undefined") return;
  const isDark = mode === "dark";
  const root = document.documentElement;
  const needsApply =
    root.classList.contains("dark") !== isDark ||
    root.style.colorScheme !== (isDark ? "dark" : "light");
  if (!needsApply) return;

  const guard = document.createElement("style");
  guard.id = "cab-theme-no-transition";
  guard.textContent =
    "*,*::before,*::after{transition:none!important;animation:none!important}";
  document.head.appendChild(guard);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";

  // ponytail: reflow singolo — evita interpolazione di migliaia di transition Tailwind al toggle .dark
  void root.offsetWidth;
  guard.remove();
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

export function writeThemeBootCookie(mode: PersistedThemeMode): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${CAB_THEME_STORAGE_KEY}=${mode};path=/;max-age=${CAB_THEME_COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function writeThemeBootCache(mode: PersistedThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAB_THEME_STORAGE_KEY, mode);
    writeThemeBootCookie(mode);
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
    writeThemeBootCookie(DEFAULT_PERSISTED_THEME_MODE);
  } catch {
    /* ignore */
  }
}

/** Tema boot: cache locale valida oppure default globale (mai preferenza OS). */
export function resolveBootThemeMode(): PersistedThemeMode {
  runThemeClientMigrationToDefault();
  return readThemeBootCache() ?? DEFAULT_PERSISTED_THEME_MODE;
}
