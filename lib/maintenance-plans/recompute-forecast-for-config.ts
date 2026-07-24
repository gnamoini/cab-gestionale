import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS,
  MAINTENANCE_PRESET_TRIGGERS_COLUMNS,
} from "@/lib/db/table-select-columns";
import { buildForecastDbRow } from "@/lib/maintenance-plans/build-forecast-row";
import { resolveCurrentMezzoMetering } from "@/lib/maintenance-plans/fetch-mezzo-metering";
import type { ExecutionPoint } from "@/lib/maintenance-plans/forecast/ema-forecast";
import type { PresetTriggerGroupDef } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import { evaluateConfigDue } from "@/lib/maintenance-plans/maintenance-due-engine";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { currentValueForInterval } from "@/lib/maintenance-plans/resolve-mezzo-metering";

export type ConfigForecastInput = {
  id: string;
  mezzo_id: string;
  preset_id?: string | null;
  interval_type: MaintenanceIntervalType;
  interval_value: number;
};

async function loadTriggerGroupsForPreset(
  client: SupabaseClient,
  presetId: string | null | undefined,
): Promise<PresetTriggerGroupDef[]> {
  if (!presetId) return [];
  const { data: groups } = await client
    .from("maintenance_preset_trigger_groups")
    .select(MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS)
    .eq("preset_id", presetId)
    .order("sort_order", { ascending: true });
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id as string);
  const { data: triggers } = await client
    .from("maintenance_preset_triggers")
    .select(MAINTENANCE_PRESET_TRIGGERS_COLUMNS)
    .in("group_id", groupIds);

  return groups.map((g) => ({
    operator: g.operator as PresetTriggerGroupDef["operator"],
    sortOrder: g.sort_order as number,
    triggers: (triggers ?? [])
      .filter((t) => t.group_id === g.id)
      .map((t) => ({
        triggerType: t.trigger_type as MaintenanceIntervalType,
        threshold: Number(t.threshold),
        priority: t.priority as number,
      })),
  }));
}

export async function computeForecastForConfig(
  client: SupabaseClient,
  config: ConfigForecastInput,
  trigger: "manual_recompute" | "execution_registered" = "manual_recompute",
  pendingExecution?: ExecutionPoint,
): Promise<{ row: ReturnType<typeof buildForecastDbRow>; trigger: string }> {
  const { data: services } = await client
    .from("vehicle_maintenance_services")
    .select("performed_at, ore_at_service, km_at_service")
    .eq("config_id", config.id)
    .order("performed_at", { ascending: true });

  const metering = await resolveCurrentMezzoMetering(client, config.mezzo_id);
  const currentValue = currentValueForInterval(config.interval_type, metering);
  const executions = (services ?? []).map((s) => ({
    performedAt: s.performed_at as string,
    valueAtService:
      config.interval_type === "km"
        ? Number(s.km_at_service ?? s.ore_at_service)
        : Number(s.ore_at_service),
  }));
  if (pendingExecution) {
    executions.push(pendingExecution);
    executions.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }

  const groups = await loadTriggerGroupsForPreset(client, config.preset_id);
  const { forecast, explainability } = evaluateConfigDue({
    groups,
    intervalType: config.interval_type,
    intervalValue: Number(config.interval_value),
    currentValue,
    currentKm: metering.km,
    executions,
  });

  const computedAt = new Date().toISOString();
  return {
    row: buildForecastDbRow(config.id, forecast, computedAt, explainability),
    trigger,
  };
}

export async function persistForecastForConfig(
  client: SupabaseClient,
  config: ConfigForecastInput,
  trigger: "manual_recompute" | "execution_registered" = "manual_recompute",
): Promise<void> {
  const { row, trigger: histTrigger } = await computeForecastForConfig(client, config, trigger);

  const { error: upsertErr } = await client
    .from("vehicle_maintenance_forecasts")
    .upsert(row, { onConflict: "config_id" });
  if (upsertErr) throw upsertErr;

  await client.from("vehicle_maintenance_forecast_history").insert({
    ...row,
    trigger: histTrigger,
  });
}

export function forecastRowToRpcJson(row: ReturnType<typeof buildForecastDbRow>): Record<string, unknown> {
  return {
    computed_at: row.computed_at,
    next_date_estimated: row.next_date_estimated,
    next_milestone_value: row.next_milestone_value,
    remaining_value: row.remaining_value,
    confidence_level: row.confidence_level,
    confidence_pct: row.confidence_pct,
    confidence_reason: row.confidence_reason,
    ema_rate_per_day: row.ema_rate_per_day,
    observation_count: row.observation_count,
    variance: row.variance,
    stddev: row.stddev,
    engine_version: row.engine_version,
    trigger_reason: row.trigger_reason,
    explainability_json: row.explainability_json,
  };
}
