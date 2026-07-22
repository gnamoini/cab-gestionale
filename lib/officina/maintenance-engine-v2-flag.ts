/**
 * Feature flag Maintenance Engine v2.
 * SSOT DB: app_settings module `system`, key `maintenance_engine_v2`.
 * Kill switch env: NEXT_PUBLIC_MAINTENANCE_ENGINE_V2=0
 */

export const MAINTENANCE_ENGINE_V2_MODULE = "system" as const;
export const MAINTENANCE_ENGINE_V2_KEY = "maintenance_engine_v2" as const;

export type MaintenanceEngineV2Flags = {
  enabled: boolean;
  percentage: number;
  allowedRoles: string[];
};

export const MAINTENANCE_ENGINE_V2_DEFAULT: MaintenanceEngineV2Flags = {
  enabled: true,
  percentage: 100,
  allowedRoles: [],
};

export function parseMaintenanceEngineV2Flags(value: unknown): MaintenanceEngineV2Flags {
  if (value == null || typeof value !== "object") return { ...MAINTENANCE_ENGINE_V2_DEFAULT };
  const o = value as Record<string, unknown>;
  const percentage =
    typeof o.percentage === "number" && o.percentage >= 0 && o.percentage <= 100
      ? o.percentage
      : MAINTENANCE_ENGINE_V2_DEFAULT.percentage;
  const allowedRoles = Array.isArray(o.allowed_roles)
    ? o.allowed_roles.filter((r): r is string => typeof r === "string")
    : [];
  return {
    enabled: o.enabled !== false,
    percentage,
    allowedRoles,
  };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readMaintenanceEngineV2FromRows(
  rows: AppSettingsRowLike[] | undefined,
): MaintenanceEngineV2Flags {
  if (!rows?.length) return { ...MAINTENANCE_ENGINE_V2_DEFAULT };
  const row = rows.find((r) => r.module === MAINTENANCE_ENGINE_V2_MODULE && r.key === MAINTENANCE_ENGINE_V2_KEY);
  return parseMaintenanceEngineV2Flags(row?.value);
}

export function isMaintenanceEngineV2EnvDisabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_ENGINE_V2?.trim() === "0";
}

/** Hash stabile userId → bucket 0-99 per percentage rollout. */
export function maintenanceEngineV2UserBucket(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) % 100;
  }
  return Math.abs(h) % 100;
}

export function resolveMaintenanceEngineV2Enabled(input: {
  dbFlags?: MaintenanceEngineV2Flags | null;
  userId?: string | null;
  userRole?: string | null;
}): boolean {
  if (isMaintenanceEngineV2EnvDisabled()) return false;

  const flags = input.dbFlags ?? MAINTENANCE_ENGINE_V2_DEFAULT;
  if (!flags.enabled) return false;

  if (flags.allowedRoles.length > 0) {
    const role = input.userRole?.trim().toLowerCase() ?? "";
    if (!role || !flags.allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
      return false;
    }
  }

  if (flags.percentage >= 100) return true;
  if (flags.percentage <= 0) return false;
  if (!input.userId?.trim()) return flags.percentage > 50;

  return maintenanceEngineV2UserBucket(input.userId) < flags.percentage;
}

/** @deprecated Usare useMaintenanceEngineV2Enabled / resolveMaintenanceEngineV2EnabledClient */
export function isMaintenanceEngineV2Enabled(): boolean {
  return resolveMaintenanceEngineV2Enabled({});
}
