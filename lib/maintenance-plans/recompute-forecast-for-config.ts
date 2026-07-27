import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS,
  MAINTENANCE_PRESET_TRIGGERS_COLUMNS,
  SCHEDA_LAVORAZIONE_COLUMNS,
} from "@/lib/db/table-select-columns";
import { buildForecastDbRow } from "@/lib/maintenance-plans/build-forecast-row";
import { resolveCurrentMezzoMetering } from "@/lib/maintenance-plans/fetch-mezzo-metering";
import type { ExecutionPoint } from "@/lib/maintenance-plans/forecast/ema-forecast";
import type { PresetTriggerGroupDef } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import {
  dedupeExecutionPoints,
  mergeExecutionPoints,
  serviceMatchesConfig,
  toExecutionPoint,
  type ServiceExecutionLite,
} from "@/lib/maintenance-plans/load-config-executions";
import { evaluateConfigDue } from "@/lib/maintenance-plans/maintenance-due-engine";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { currentValueForInterval } from "@/lib/maintenance-plans/resolve-mezzo-metering";
import {
  buildSyntheticTagliandoHistoryViews,
  parseIngressoMeterFromSchedaContenuto,
} from "@/lib/maintenance-plans/synthesize-tagliando-lavorazioni";
import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";

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

/** Esecuzioni DB (config_id o mezzo+preset) + sintetici da lavorazioni chiuse senza service. */
export async function loadExecutionPointsForConfig(
  client: SupabaseClient,
  config: ConfigForecastInput,
): Promise<ExecutionPoint[]> {
  const { data: services } = await client
    .from("vehicle_maintenance_services")
    .select("config_id, mezzo_id, plan_id, performed_at, ore_at_service, km_at_service, lavorazione_id")
    .eq("mezzo_id", config.mezzo_id)
    .order("performed_at", { ascending: true });

  const matchKey = {
    configId: config.id,
    mezzoId: config.mezzo_id,
    presetId: config.preset_id ?? null,
    intervalType: config.interval_type,
  };

  const fromServices = ((services ?? []) as ServiceExecutionLite[])
    .filter((s) => serviceMatchesConfig(s, matchKey))
    .map((s) => toExecutionPoint(config.interval_type, s));

  const registeredLavIds = new Set(
    (services ?? [])
      .map((s) => s.lavorazione_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  const synthetic = await loadSyntheticExecutionPointsForConfig(client, config, registeredLavIds);
  return dedupeExecutionPoints([...fromServices, ...synthetic]);
}

async function loadSyntheticExecutionPointsForConfig(
  client: SupabaseClient,
  config: ConfigForecastInput,
  registeredLavorazioneIds: ReadonlySet<string>,
): Promise<ExecutionPoint[]> {
  const presetId = config.preset_id?.trim();
  if (!presetId) return [];

  const { data: lavRows } = await client
    .from("lavorazioni")
    .select("id, stato, archived, data_uscita, data_ingresso, tagliando_preset_ref")
    .eq("mezzo_id", config.mezzo_id)
    .eq("is_tagliando", true)
    .is("deleted_at", null);

  const candidates = (lavRows ?? []).filter((l) => {
    if (registeredLavorazioneIds.has(l.id as string)) return false;
    const archived = l.archived === true;
    const completed = l.stato === STATO_LAVORAZIONE_COMPLETATA_ID;
    if (!archived && !completed) return false;
    const ref = (l.tagliando_preset_ref as string | null)?.trim() ?? "";
    return !ref || ref === presetId;
  });
  if (candidates.length === 0) return [];

  const lavIds = candidates.map((l) => l.id as string);
  const { data: schede } = await client
    .from("scheda_lavorazione")
    .select(`${SCHEDA_LAVORAZIONE_COLUMNS}`)
    .in("lavorazione_id", lavIds)
    .eq("tipo", "ingresso");

  const ingressiByLavorazioneId = new Map<string, { lavorazioneId: string; oreLavoro: number; km: number | null }>();
  for (const scheda of schede ?? []) {
    const lavId = scheda.lavorazione_id as string;
    const meter = parseIngressoMeterFromSchedaContenuto(scheda.contenuto);
    ingressiByLavorazioneId.set(lavId, {
      lavorazioneId: lavId,
      oreLavoro: meter.ore,
      km: meter.km,
    });
  }

  const syntheticViews = buildSyntheticTagliandoHistoryViews({
    lavorazioni: candidates.map((l) => ({
      id: l.id as string,
      stato: l.stato as string,
      archived: l.archived as boolean | null,
      data_uscita: l.data_uscita as string | null,
      data_ingresso: l.data_ingresso as string | null,
      tagliando_preset_ref: l.tagliando_preset_ref as string | null,
    })),
    ingressiByLavorazioneId,
    registeredLavorazioneIds,
    activePresetIds: [presetId],
    planNames: new Map([[presetId, ""]]),
  });

  return syntheticViews
    .filter((v) => v.planId === presetId)
    .map((v) =>
      toExecutionPoint(config.interval_type, {
        performed_at: v.performedAt,
        ore_at_service: v.oreAtService,
        km_at_service: v.kmAtService,
      }),
    );
}

export async function computeForecastForConfig(
  client: SupabaseClient,
  config: ConfigForecastInput,
  trigger: "manual_recompute" | "execution_registered" = "manual_recompute",
  pendingExecution?: ExecutionPoint,
): Promise<{ row: ReturnType<typeof buildForecastDbRow>; trigger: string }> {
  const metering = await resolveCurrentMezzoMetering(client, config.mezzo_id);
  const currentValue = currentValueForInterval(config.interval_type, metering);
  const loaded = await loadExecutionPointsForConfig(client, config);
  const executions = dedupeExecutionPoints(mergeExecutionPoints(loaded, pendingExecution ?? null));

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
