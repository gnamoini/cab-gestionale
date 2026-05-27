/** Modulo `app_settings` per preferenze personali (key = `profiles.id`). */
export const USER_PREFS_SETTINGS_MODULE = "user_prefs";

export type PersistedThemeMode = "light" | "dark";

/** Default globale applicazione (boot, nuovi utenti, assenza preferenza salvata). */
export const DEFAULT_PERSISTED_THEME_MODE: PersistedThemeMode = "dark";

export function parsePersistedThemeMode(value: unknown): PersistedThemeMode | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

export function themeModeFromSettingsValue(value: Record<string, unknown> | null | undefined): PersistedThemeMode | null {
  if (!value || typeof value !== "object") return null;
  return parsePersistedThemeMode(value.theme);
}
