/**
 * Feature flag Calendar V2 — dashboard operativa con analytics panel.
 * Override env: NEXT_PUBLIC_CALENDAR_V2=0|1
 */

export const CALENDAR_V2_MODULE = "system" as const;
export const CALENDAR_V2_KEY = "calendar_v2_enabled" as const;

export function parseCalendarV2Enabled(value: unknown): boolean | null {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return null;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readCalendarV2EnabledFromRows(rows: AppSettingsRowLike[] | undefined): boolean | null {
  if (!rows?.length) return null;
  const row = rows.find((r) => r.module === CALENDAR_V2_MODULE && r.key === CALENDAR_V2_KEY);
  if (!row) return null;
  if (typeof row.value === "boolean") return row.value;
  return parseCalendarV2Enabled(row.value);
}

/** Default off — migrazione graduale. Env vince su DB. */
export function resolveCalendarV2Enabled(dbFlag?: boolean | null): boolean {
  const env = process.env.NEXT_PUBLIC_CALENDAR_V2?.trim();
  if (env === "1" || env === "true") return true;
  if (env === "0" || env === "false") return false;
  if (dbFlag != null) return dbFlag;
  return false;
}
