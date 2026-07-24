/**
 * SSOT contract — Maintenance Planning preset-first domain.
 *
 * SOURCE OF TRUTH (write + forecast read):
 *   maintenance_preset_trigger_groups
 *   maintenance_preset_triggers
 *
 * LEGACY CACHE (write only via upsertPlan sync; never read for forecast/compat):
 *   maintenance_plans.interval_type | interval_value | interval_ore
 *   vehicle_maintenance_configs.interval_type | interval_value
 *
 * READ-ONLY (no runtime compatibility decisions):
 *   maintenance_plan_equipment_types
 */

export const MAINTENANCE_INTERVAL_SSOT_TABLES = [
  "maintenance_preset_trigger_groups",
  "maintenance_preset_triggers",
] as const;

export const MAINTENANCE_LEGACY_INTERVAL_CACHE_COLUMNS = [
  "maintenance_plans.interval_ore",
  "maintenance_plans.interval_type",
  "maintenance_plans.interval_value",
  "vehicle_maintenance_configs.interval_type",
  "vehicle_maintenance_configs.interval_value",
] as const;

/** Junction kept for audit/history only — must not gate preset ↔ mezzo assignment. */
export const MAINTENANCE_EQUIPMENT_JUNCTION_TABLE = "maintenance_plan_equipment_types" as const;

/** @deprecated Use active vehicle_maintenance_configs instead. */
export const MEZZO_TAGLIANDI_META_KEY = "tagliandi" as const;

export const MAINTENANCE_PRESET_ASSIGNABLE_STATUSES = ["active"] as const;

export function isPresetAssignable(status: string | null | undefined): boolean {
  return status === "active";
}
