/**
 * Feature flag Asset Lifecycle Layer v1.
 * SSOT DB: app_settings module `system`, key `asset_lifecycle_v1`.
 * Override env: NEXT_PUBLIC_ASSET_LIFECYCLE_V1=0|1
 */

export const ASSET_LIFECYCLE_V1_MODULE = "system" as const;
export const ASSET_LIFECYCLE_V1_KEY = "asset_lifecycle_v1" as const;

export type AssetLifecycleV1Flags = {
  enabled: boolean;
  compliance: boolean;
  assignment_history: boolean;
  mileage_history: boolean;
  timeline_calendar: boolean;
};

export const ASSET_LIFECYCLE_V1_DEFAULT: AssetLifecycleV1Flags = {
  enabled: false,
  compliance: false,
  assignment_history: false,
  mileage_history: false,
  timeline_calendar: false,
};

export function parseAssetLifecycleV1Flags(value: unknown): AssetLifecycleV1Flags {
  if (value == null || typeof value !== "object") return { ...ASSET_LIFECYCLE_V1_DEFAULT };
  const o = value as Record<string, unknown>;
  const enabled = o.enabled === true;
  return {
    enabled,
    compliance: enabled && o.compliance === true,
    assignment_history: enabled && o.assignment_history === true,
    mileage_history: enabled && o.mileage_history === true,
    timeline_calendar: enabled && o.timeline_calendar === true,
  };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readAssetLifecycleV1FromRows(rows: AppSettingsRowLike[] | undefined): AssetLifecycleV1Flags {
  if (!rows?.length) return { ...ASSET_LIFECYCLE_V1_DEFAULT };
  const row = rows.find((r) => r.module === ASSET_LIFECYCLE_V1_MODULE && r.key === ASSET_LIFECYCLE_V1_KEY);
  return parseAssetLifecycleV1Flags(row?.value);
}

export function isAssetLifecycleV1EnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1?.trim() === "1";
}

export function isAssetLifecycleV1EnvDisabled(): boolean {
  return process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1?.trim() === "0";
}

/** Env=0 vince; env=1 o flag DB abilitato. */
export function resolveAssetLifecycleV1Flags(dbFlags?: AssetLifecycleV1Flags | null): AssetLifecycleV1Flags {
  if (isAssetLifecycleV1EnvDisabled()) return { ...ASSET_LIFECYCLE_V1_DEFAULT };
  if (isAssetLifecycleV1EnvEnabled()) {
    return {
      enabled: true,
      compliance: true,
      assignment_history: true,
      mileage_history: true,
      timeline_calendar: true,
    };
  }
  return dbFlags ?? { ...ASSET_LIFECYCLE_V1_DEFAULT };
}

export function isAssetLifecycleSubFlagActive(
  flags: AssetLifecycleV1Flags,
  sub: keyof Omit<AssetLifecycleV1Flags, "enabled">,
): boolean {
  return flags.enabled && flags[sub] === true;
}
