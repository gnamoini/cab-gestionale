/**
 * Override pilot: `can_manage_settings` per operatori.
 * Source of truth applicativa — env (deploy) AND flag DB devono essere entrambi attivi.
 *
 * RLS Postgres usa `rbac_operator_global_settings_db_enabled()` (solo DB; env non leggibile in SQL).
 */

export const OPERATOR_GLOBAL_SETTINGS_MODULE = "system" as const;
export const OPERATOR_GLOBAL_SETTINGS_KEY = "enable_operator_global_settings" as const;

/** `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1` — assente o altro valore → false. */
export function isOperatorGlobalSettingsEnvEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS?.trim() ?? "";
  return raw === "1";
}

/**
 * Interpreta `app_settings.system.enable_operator_global_settings`.
 * Formati supportati: `{ "enabled": true }` oppure booleano JSON.
 */
export function parseOperatorGlobalSettingsDbEnabled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "object" && value !== null && "enabled" in value) {
    const enabled = (value as { enabled?: unknown }).enabled;
    return enabled === true;
  }
  return false;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

/** Estrae il flag DB da righe `app_settings` (payload settings). */
export function readOperatorGlobalSettingsDbEnabledFromRows(rows: AppSettingsRowLike[] | undefined): boolean {
  if (!rows?.length) return false;
  const row = rows.find(
    (r) => r.module === OPERATOR_GLOBAL_SETTINGS_MODULE && r.key === OPERATOR_GLOBAL_SETTINGS_KEY,
  );
  return parseOperatorGlobalSettingsDbEnabled(row?.value);
}

/**
 * Pilot attivo solo se env e DB sono entrambi true.
 * Se `dbEnabled` non è noto, trattare come false (fail-safe).
 */
export function isOperatorGlobalSettingsEnabled(dbEnabled: boolean): boolean {
  return isOperatorGlobalSettingsEnvEnabled() && dbEnabled === true;
}

/** @deprecated Usare `isOperatorGlobalSettingsEnvEnabled` / `isOperatorGlobalSettingsEnabled`. */
export const isPilotOperatorGlobalSettingsEnabled = isOperatorGlobalSettingsEnvEnabled;
