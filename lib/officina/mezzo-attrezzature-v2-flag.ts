/**
 * Feature flag migrazione Cliente → Mezzo → Attrezzature.
 * SSOT DB: `app_settings` module `system`, key `mezzo_attrezzature_v2`.
 * Override env: `NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2=1`
 */

export const MEZZO_ATTREZZATURE_V2_MODULE = "system" as const;
export const MEZZO_ATTREZZATURE_V2_KEY = "mezzo_attrezzature_v2" as const;

export function isMezzoAttrezzatureV2EnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2?.trim() === "1";
}

export function parseMezzoAttrezzatureV2DbEnabled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "object" && value !== null && "enabled" in value) {
    return (value as { enabled?: unknown }).enabled === true;
  }
  return false;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readMezzoAttrezzatureV2DbEnabledFromRows(
  rows: AppSettingsRowLike[] | undefined,
): boolean {
  if (!rows?.length) return false;
  const row = rows.find(
    (r) => r.module === MEZZO_ATTREZZATURE_V2_MODULE && r.key === MEZZO_ATTREZZATURE_V2_KEY,
  );
  return parseMezzoAttrezzatureV2DbEnabled(row?.value);
}

/** V2 SSOT: attivo di default. Override emergenza: env `=0`; env `=1` forza ON. */
export function isMezzoAttrezzatureV2Enabled(dbEnabled?: boolean): boolean {
  if (process.env.NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2?.trim() === "0") return false;
  if (isMezzoAttrezzatureV2EnvEnabled()) return true;
  if (dbEnabled === false) return false;
  return true;
}
