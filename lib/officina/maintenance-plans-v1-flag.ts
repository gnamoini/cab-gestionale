/**
 * Feature flag Maintenance Plans v1.
 * SSOT DB: app_settings module `system`, key `maintenance_plans_v1`.
 * Override env: NEXT_PUBLIC_MAINTENANCE_PLANS_V1=0|1
 *
 * ponytail: dominio separato da asset_compliance (scadenze legali/calendario).
 * maintenance_plans = tagliandi operativi ore-based.
 */

export const MAINTENANCE_PLANS_V1_MODULE = "system" as const;
export const MAINTENANCE_PLANS_V1_KEY = "maintenance_plans_v1" as const;

export type MaintenancePlansV1Flags = {
  enabled: boolean;
};

export const MAINTENANCE_PLANS_V1_DEFAULT: MaintenancePlansV1Flags = {
  enabled: false,
};

export function parseMaintenancePlansV1Flags(value: unknown): MaintenancePlansV1Flags {
  if (value == null || typeof value !== "object") return { ...MAINTENANCE_PLANS_V1_DEFAULT };
  const o = value as Record<string, unknown>;
  return { enabled: o.enabled === true };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readMaintenancePlansV1FromRows(rows: AppSettingsRowLike[] | undefined): MaintenancePlansV1Flags {
  if (!rows?.length) return { ...MAINTENANCE_PLANS_V1_DEFAULT };
  const row = rows.find((r) => r.module === MAINTENANCE_PLANS_V1_MODULE && r.key === MAINTENANCE_PLANS_V1_KEY);
  return parseMaintenancePlansV1Flags(row?.value);
}

export function isMaintenancePlansV1EnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1?.trim() === "1";
}

export function isMaintenancePlansV1EnvDisabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1?.trim() === "0";
}

/** Env=0 vince; env=1 o flag DB abilitato. */
export function resolveMaintenancePlansV1Flags(dbFlags?: MaintenancePlansV1Flags | null): MaintenancePlansV1Flags {
  if (isMaintenancePlansV1EnvDisabled()) return { ...MAINTENANCE_PLANS_V1_DEFAULT };
  if (isMaintenancePlansV1EnvEnabled()) return { enabled: true };
  return dbFlags ?? { ...MAINTENANCE_PLANS_V1_DEFAULT };
}
