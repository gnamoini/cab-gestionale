"use client";

import { computeMaintenanceUrgency } from "@/lib/maintenance-plans/compute-maintenance-urgency";
import { formatDueReason } from "@/lib/maintenance-plans/maintenance-due-engine";
import {
  MAINTENANCE_PRESET_CATEGORIES_COLUMNS,
  VEHICLE_MAINTENANCE_CONFIGS_COLUMNS,
  VEHICLE_MAINTENANCE_FORECASTS_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICES_V2_COLUMNS,
} from "@/lib/db/table-select-columns";
import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import {
  fetchAttrezzatureForMezzoIds,
  indexAttrezzatureByMezzoId,
} from "@/lib/mezzi/mezzi-attrezzature-batch";
import { pickAttrezzaturaForContext } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { resolveCurrentMezzoMetering, resolveCurrentMezzoMeteringBatch } from "@/lib/maintenance-plans/fetch-mezzo-metering";
import {
  MAINTENANCE_AUDIT_ACTIONS,
  writeMaintenanceAuditEvent,
} from "@/lib/maintenance-plans/maintenance-audit";
import { processMaintenanceWarehouseDischarge } from "@/lib/maintenance-plans/process-maintenance-warehouse";
import { loadEffectivePresetForConfig } from "@/lib/maintenance-plans/load-effective-preset-for-config";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { EffectivePreset } from "@/lib/maintenance-plans/resolve-effective-preset";
import {
  computeForecastForConfig,
  forecastRowToRpcJson,
  persistForecastForConfig,
} from "@/lib/maintenance-plans/recompute-forecast-for-config";
import {
  pickLatestMatchingService,
  valueAtServiceForInterval,
  type ServiceExecutionLite,
} from "@/lib/maintenance-plans/load-config-executions";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import { primaryIntervalFromTriggers } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import {
  currentValueForInterval,
  formatIntervalLabel,
  type MezzoMetering,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";
import type {
  BulkAssignPresetResult,
  MezzoPresetAssignRow,
  MezzoWithoutPresetRow,
  RegisterMaintenanceExecutionInput,
  TagliandiOverviewRow,
  UpsertVehicleMaintenanceConfigInput,
  VehicleMaintenanceConfigView,
} from "@/lib/maintenance-plans/v2-types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { maintenancePlansService } from "@/src/services/maintenance-plans.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { VehicleMaintenanceServiceRow } from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA_CONFIG = "vehicle_maintenance_configs";

type ConfigRow = {
  id: string;
  mezzo_id: string;
  preset_id: string | null;
  preset_version_id: string | null;
  maintenance_kind: string;
  is_active: boolean;
  interval_type: MaintenanceIntervalType;
  interval_value: number;
  label: string | null;
  activated_at: string | null;
  deactivated_at: string | null;
  planned_lavorazione_id: string | null;
};

type ForecastRow = {
  config_id: string;
  next_date_estimated: string | null;
  next_milestone_value: number | null;
  remaining_value: number | null;
  confidence_level: string | null;
  confidence_pct: number | null;
  confidence_reason: string | null;
  trigger_reason: string | null;
  explainability_json: import("@/lib/maintenance-plans/forecast/trigger-group-forecast").ForecastExplainability | null;
};

type LastServiceRow = {
  performed_at: string;
  ore_at_service: number;
  km_at_service: number | null;
};

async function sb() {
  return getBrowserSupabase();
}

function buildLastServiceMap(
  services: ServiceExecutionLite[],
  configs: { id: string; mezzo_id: string; preset_id: string | null; interval_type: MaintenanceIntervalType }[],
): Map<string, LastServiceRow> {
  const lastByConfig = new Map<string, LastServiceRow>();
  for (const c of configs) {
    const latest = pickLatestMatchingService(services, {
      configId: c.id,
      mezzoId: c.mezzo_id,
      presetId: c.preset_id,
      intervalType: c.interval_type,
    });
    if (!latest) continue;
    lastByConfig.set(c.id, {
      performed_at: latest.performed_at,
      ore_at_service: Number(latest.ore_at_service),
      km_at_service: latest.km_at_service != null ? Number(latest.km_at_service) : null,
    });
  }
  return lastByConfig;
}

function resolveConfigPresetNome(
  presetId: string | null,
  presetMap: Map<string, string>,
  storedLabel: string | null | undefined,
): string {
  if (presetId) {
    return presetMap.get(presetId) ?? storedLabel?.trim() ?? "Preset rimosso";
  }
  return storedLabel?.trim() ?? "—";
}

function joinMarcaModello(marca: string | null | undefined, modello: string | null | undefined): string | null {
  const label = [marca, modello]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0 && v !== "—")
    .join(" ");
  return label || null;
}

async function resolveMezzoConfigUpsertTargetId(
  client: Awaited<ReturnType<typeof sb>>,
  input: { id?: string; mezzoId: string; presetId: string },
): Promise<{ id?: string; conflict?: string }> {
  const explicitId = input.id?.trim();
  if (explicitId) {
    const { data: duplicate } = await client
      .from("vehicle_maintenance_configs")
      .select("id")
      .eq("mezzo_id", input.mezzoId)
      .eq("preset_id", input.presetId)
      .is("deleted_at", null)
      .neq("id", explicitId)
      .maybeSingle();
    if (duplicate) return { conflict: "Questo preset è già assegnato al mezzo." };
    return { id: explicitId };
  }

  const { data: existingSame } = await client
    .from("vehicle_maintenance_configs")
    .select("id")
    .eq("mezzo_id", input.mezzoId)
    .eq("preset_id", input.presetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingSame?.id) return { id: existingSame.id as string };

  const { data: orphan } = await client
    .from("vehicle_maintenance_configs")
    .select("id")
    .eq("mezzo_id", input.mezzoId)
    .is("preset_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (orphan?.id) return { id: orphan.id as string };

  return {};
}

async function loadSingleConfigView(
  client: Awaited<ReturnType<typeof sb>>,
  row: ConfigRow,
  mezzoId: string,
): Promise<VehicleMaintenanceConfigView> {
  const metering = await resolveCurrentMezzoMetering(client, mezzoId);
  const [forecastRes, servicesRes, presetRes, partsCountRes] = await Promise.all([
    client
      .from("vehicle_maintenance_forecasts")
      .select(VEHICLE_MAINTENANCE_FORECASTS_COLUMNS)
      .eq("config_id", row.id)
      .maybeSingle(),
    client
      .from("vehicle_maintenance_services")
      .select("config_id, mezzo_id, plan_id, performed_at, ore_at_service, km_at_service, lavorazione_id")
      .eq("mezzo_id", mezzoId)
      .order("performed_at", { ascending: false }),
    row.preset_id
      ? client.from("maintenance_plans").select("id, nome").eq("id", row.preset_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.preset_id
      ? client
          .from("maintenance_plan_parts")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", row.preset_id)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const presetMap = new Map<string, string>();
  if (presetRes.data && typeof presetRes.data === "object" && "id" in presetRes.data) {
    presetMap.set(presetRes.data.id as string, presetRes.data.nome as string);
  }
  const lastMap = buildLastServiceMap((servicesRes.data ?? []) as ServiceExecutionLite[], [row]);

  return mapConfigToViewFromBatch({
    c: row,
    mezzoId,
    metering,
    forecast: (forecastRes.data as ForecastRow | null) ?? null,
    lastService: lastMap.get(row.id) ?? null,
    presetNome: resolveConfigPresetNome(row.preset_id, presetMap, row.label),
    partsCount: partsCountRes.count ?? 0,
  });
}

function mapConfigToViewFromBatch(input: {
  c: ConfigRow;
  mezzoId: string;
  metering: MezzoMetering;
  forecast: ForecastRow | null;
  lastService: LastServiceRow | null;
  presetNome: string;
  partsCount: number;
}): VehicleMaintenanceConfigView {
  const { c, metering, forecast, lastService, presetNome, partsCount } = input;
  const currentValue = currentValueForInterval(c.interval_type, metering);
  const remaining = forecast?.remaining_value ?? null;
  const urgency = computeMaintenanceUrgency({
    nextDateEstimated: forecast?.next_date_estimated ?? null,
    remainingValue: remaining ?? 0,
  });

  return {
    id: c.id,
    mezzoId: input.mezzoId,
    presetId: c.preset_id,
    presetVersionId: c.preset_version_id,
    presetNome,
    maintenanceKind: c.maintenance_kind as VehicleMaintenanceConfigView["maintenanceKind"],
    isActive: c.is_active,
    intervalType: c.interval_type,
    intervalValue: Number(c.interval_value),
    label: presetNome,
    activatedAt: c.activated_at,
    deactivatedAt: c.deactivated_at,
    plannedLavorazioneId: c.planned_lavorazione_id,
    ultimoPerformedAt: lastService?.performed_at ?? null,
    ultimoValueAtService: lastService
      ? valueAtServiceForInterval(c.interval_type, {
          ore_at_service: lastService.ore_at_service,
          km_at_service: lastService.km_at_service,
        })
      : null,
    currentValue,
    remainingValue: remaining,
    nextDateEstimated: forecast?.next_date_estimated ?? null,
    confidenceLevel: (forecast?.confidence_level as VehicleMaintenanceConfigView["confidenceLevel"]) ?? null,
    confidencePct: forecast?.confidence_pct ?? null,
    confidenceReason: forecast?.confidence_reason ?? null,
    triggerReason: forecast?.trigger_reason ?? null,
    explainability: forecast?.explainability_json ?? null,
    urgency,
    partsCount,
  };
}

async function loadConfigViewBatch(
  client: Awaited<ReturnType<typeof sb>>,
  configs: ConfigRow[],
  mezzoId: string,
  metering: MezzoMetering,
): Promise<VehicleMaintenanceConfigView[]> {
  if (configs.length === 0) return [];

  const configIds = configs.map((c) => c.id);
  const presetIds = [...new Set(configs.map((c) => c.preset_id).filter(Boolean))] as string[];

  const [forecastsRes, servicesRes, presetsRes, plansRes] = await Promise.all([
    client.from("vehicle_maintenance_forecasts").select(VEHICLE_MAINTENANCE_FORECASTS_COLUMNS).in("config_id", configIds),
    client
      .from("vehicle_maintenance_services")
      .select("config_id, mezzo_id, plan_id, performed_at, ore_at_service, km_at_service, lavorazione_id")
      .eq("mezzo_id", mezzoId)
      .order("performed_at", { ascending: false }),
    presetIds.length > 0
      ? client.from("maintenance_plans").select("id, nome").in("id", presetIds)
      : Promise.resolve({ data: [], error: null }),
    maintenancePlansService.listPlans(),
  ]);

  const forecastMap = new Map((forecastsRes.data ?? []).map((f) => [(f as ForecastRow).config_id, f as ForecastRow]));
  const lastMap = buildLastServiceMap((servicesRes.data ?? []) as ServiceExecutionLite[], configs);
  const presetMap = new Map((presetsRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
  const partsCountByPreset = new Map<string, number>();
  for (const p of plansRes.data ?? []) {
    partsCountByPreset.set(p.id, p.parts.length);
  }

  return configs.map((c) => {
    const presetNome = resolveConfigPresetNome(c.preset_id, presetMap, c.label);
    return mapConfigToViewFromBatch({
      c,
      mezzoId,
      metering,
      forecast: forecastMap.get(c.id) ?? null,
      lastService: lastMap.get(c.id) ?? null,
      presetNome,
      partsCount: c.preset_id ? (partsCountByPreset.get(c.preset_id) ?? 0) : 0,
    });
  });
}

export const maintenanceEngineV2Service = {
  async listMezzoConfigs(input: {
    mezzoId: string;
    oreKm?: number;
    kmFromMeta?: number | null;
  }): Promise<ServiceResult<VehicleMaintenanceConfigView[]>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("mezzo_id", input.mezzoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));

      const configs = (data ?? []) as ConfigRow[];
      const metering = await resolveCurrentMezzoMetering(client, input.mezzoId);
      const views = await loadConfigViewBatch(client, configs, input.mezzoId, metering);
      return success(views);
    } catch (e) {
      return serviceFailFromError<VehicleMaintenanceConfigView[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async loadEffectivePresetForConfig(configId: string): Promise<ServiceResult<EffectivePreset>> {
    try {
      const client = await sb();
      const { data: config, error } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("id", configId)
        .maybeSingle();
      if (error || !config) return err("Config non trovata.");
      const preset = await loadEffectivePresetForConfig(client, config as ConfigRow);
      if (!preset) return err("Preset non trovato.");
      return success(preset);
    } catch (e) {
      return serviceFailFromError<EffectivePreset>(e, null as never, { entity: "mezzo", action: "read" });
    }
  },

  async upsertMezzoConfig(input: UpsertVehicleMaintenanceConfigInput): Promise<ServiceResult<VehicleMaintenanceConfigView>> {
    try {
      if (!input.presetId) {
        return err("Seleziona un preset esistente.");
      }

      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      const { data: presetRow, error: presetErr } = await client
        .from("maintenance_plans")
        .select("id, nome")
        .eq("id", input.presetId)
        .maybeSingle();
      if (presetErr || !presetRow) return err("Preset non trovato.");

      const payload: Record<string, unknown> = {
        mezzo_id: input.mezzoId,
        preset_id: input.presetId,
        is_active: input.isActive,
        interval_type: input.intervalType,
        interval_value: input.intervalValue,
        label: (presetRow.nome as string).trim(),
        activated_at: input.activatedAt ?? null,
        deactivated_at: input.deactivatedAt ?? null,
      };

      const { data: version } = await client
        .from("maintenance_preset_versions")
        .select("id")
        .eq("preset_id", input.presetId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      payload.preset_version_id = version?.id ?? null;

      const target = await resolveMezzoConfigUpsertTargetId(client, {
        id: input.id,
        mezzoId: input.mezzoId,
        presetId: input.presetId,
      });
      if (target.conflict) return err(target.conflict);

      let configId = target.id;
      if (configId) {
        const { error } = await client
          .from("vehicle_maintenance_configs")
          .update(payload)
          .eq("id", configId);
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      } else {
        const { data: row, error } = await client
          .from("vehicle_maintenance_configs")
          .insert({ ...payload, created_by: uid })
          .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
          .single();
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
        configId = (row as ConfigRow).id;
        try {
          await writeModificaLog(client, {
            entita: ENTITA_CONFIG,
            entita_id: configId,
            azione: "CREATE",
            payload: auditSnapshot(row, auditContext(input.label ?? "config")),
          });
        } catch (auditErr) {
          console.warn("[upsertMezzoConfig] audit log skipped:", auditErr);
        }
      }

      const recomputeRes = await maintenanceEngineV2Service.recomputeForecast(configId!);
      if (!recomputeRes.success) {
        console.warn("[upsertMezzoConfig] recompute forecast skipped:", recomputeRes.error);
      }

      const { data: savedRow, error: readErr } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("id", configId)
        .maybeSingle();
      if (readErr || !savedRow) return err("Config non trovata dopo salvataggio.");
      const view = await loadSingleConfigView(client, savedRow as ConfigRow, input.mezzoId);
      return success(view);
    } catch (e) {
      return serviceFailFromError<VehicleMaintenanceConfigView>(e, null as never, { entity: "mezzo", action: "update" });
    }
  },

  async softDeleteMezzoConfig(configId: string, mezzoId: string): Promise<ServiceResult<void>> {
    try {
      const client = await sb();
      const { error } = await client
        .from("vehicle_maintenance_configs")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", configId)
        .eq("mezzo_id", mezzoId);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined as never, { entity: "mezzo", action: "delete" });
    }
  },

  async recomputeForecast(configId: string): Promise<ServiceResult<void>> {
    try {
      const client = await sb();
      const { data: config, error: cfgErr } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("id", configId)
        .maybeSingle();
      if (cfgErr || !config) return err("Config non trovata.");

      await persistForecastForConfig(client, config as ConfigRow, "manual_recompute");
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined as never, { entity: "mezzo", action: "update" });
    }
  },

  async registerExecutionV2(
    input: RegisterMaintenanceExecutionInput,
  ): Promise<ServiceResult<VehicleMaintenanceServiceRow>> {
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      const { data: config } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("id", input.configId)
        .maybeSingle();
      if (!config) return err("Config non trovata.");

      const c = config as ConfigRow;
      const pendingValue =
        c.interval_type === "km"
          ? Number(input.kmAtService ?? input.oreAtService)
          : Number(input.oreAtService);
      const { row: forecastRow } = await computeForecastForConfig(
        client,
        c,
        "execution_registered",
        { performedAt: input.performedAt, valueAtService: pendingValue },
      );

      const partsPayload = input.parts.map((p) => ({
        ricambio_id: p.ricambioId,
        quantita: p.quantita,
        descrizione_snapshot: p.descrizioneSnapshot?.trim() || null,
        was_replaced: p.wasReplaced,
        was_due: p.wasDue,
        replacement_condition: p.replacementCondition,
        is_required_snapshot: p.isRequired,
        note: p.note?.trim() || null,
      }));

      const { data: serviceId, error: rpcErr } = await client.rpc("register_maintenance_execution_v2", {
        p_config_id: input.configId,
        p_mezzo_id: input.mezzoId,
        p_plan_id: input.planId,
        p_performed_at: input.performedAt,
        p_ore_at_service: input.oreAtService,
        p_km_at_service: input.kmAtService ?? null,
        p_mezzo_ore_snapshot: input.mezzoOreSnapshot,
        p_note: input.note.trim(),
        p_anomaly_note: input.anomalyNote?.trim() ?? "",
        p_lavorazione_id: input.lavorazioneId ?? null,
        p_scheda_lavorazione_id: input.schedaLavorazioneId ?? null,
        p_preset_version_id: c.preset_version_id,
        p_interval_type: c.interval_type,
        p_interval_value_at_execution: c.interval_value,
        p_execution_type: input.executionType,
        p_preset_snapshot: input.presetSnapshot,
        p_parts: partsPayload,
        p_forecast: forecastRowToRpcJson(forecastRow),
        p_checklist: (input.checklist ?? []).map((item) => ({
          item_label: item.itemLabel,
          checked: item.checked,
          note: item.note ?? "",
          sort_order: item.sortOrder,
        })),
      });

      if (rpcErr || !serviceId) {
        return err(humanizeGestionaleError(rpcErr?.message ?? "Registrazione fallita.", { entity: "mezzo", action: "create" }));
      }

      const { data: row, error: readErr } = await client
        .from("vehicle_maintenance_services")
        .select(VEHICLE_MAINTENANCE_SERVICES_V2_COLUMNS)
        .eq("id", serviceId as string)
        .single();
      if (readErr || !row) return err("Tagliando registrato ma lettura fallita.");

      await writeMaintenanceAuditEvent(client, {
        entity: "execution",
        entityId: serviceId as string,
        action: MAINTENANCE_AUDIT_ACTIONS.EXECUTION_REGISTERED,
        newValue: {
          configId: input.configId,
          executionType: input.executionType,
          presetSnapshot: input.presetSnapshot,
        },
        createdBy: uid,
      });

      void processMaintenanceWarehouseDischarge({
        executionId: serviceId as string,
        parts: input.parts.filter((p) => p.wasReplaced).map((p) => ({ ricambioId: p.ricambioId, quantita: p.quantita })),
      });

      return success(row as VehicleMaintenanceServiceRow);
    } catch (e) {
      return serviceFailFromError<VehicleMaintenanceServiceRow>(e, null as never, { entity: "mezzo", action: "create" });
    }
  },

  async listTagliandiOverview(): Promise<ServiceResult<TagliandiOverviewRow[]>> {
    try {
      const client = await sb();
      const { data: configs, error } = await client
        .from("vehicle_maintenance_configs")
        .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
        .eq("is_active", true)
        .is("deleted_at", null);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      if (!configs?.length) return success([]);

      const configRows = configs as ConfigRow[];
      const mezzoIds = [...new Set(configRows.map((c) => c.mezzo_id))];
      const presetIds = [...new Set(configRows.map((c) => c.preset_id).filter(Boolean))] as string[];
      const configIds = configRows.map((c) => c.id);

      const [mezziRes, attrezzatureRows, presetsRes, forecastsRes, lastServicesRes, meteringMap, plansRes] =
        await Promise.all([
          client
            .from("mezzi")
            .select("id, cliente, utilizzatore, targa, matricola, numero_scuderia, marca_telaio, modello_telaio, meta")
            .in("id", mezzoIds),
          fetchAttrezzatureForMezzoIds(client, mezzoIds),
          presetIds.length > 0
            ? client.from("maintenance_plans").select("id, nome").in("id", presetIds)
            : Promise.resolve({ data: [], error: null }),
          client
            .from("vehicle_maintenance_forecasts")
            .select(VEHICLE_MAINTENANCE_FORECASTS_COLUMNS)
            .in("config_id", configIds),
          client
            .from("vehicle_maintenance_services")
            .select("config_id, mezzo_id, plan_id, performed_at, ore_at_service, km_at_service, lavorazione_id")
            .in("mezzo_id", mezzoIds)
            .order("performed_at", { ascending: false }),
          resolveCurrentMezzoMeteringBatch(client, mezzoIds),
          maintenancePlansService.listPlans(),
        ]);

      if (mezziRes.error) return err(humanizeGestionaleError(mezziRes.error.message, { entity: "mezzo", action: "read" }));

      const mezzoMap = new Map((mezziRes.data ?? []).map((m) => [m.id as string, m]));
      const attrezzatureByMezzo = indexAttrezzatureByMezzoId(attrezzatureRows);
      const presetMap = new Map((presetsRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
      const forecastMap = new Map((forecastsRes.data ?? []).map((f) => [(f as ForecastRow).config_id, f as ForecastRow]));
      const lastByConfig = buildLastServiceMap((lastServicesRes.data ?? []) as ServiceExecutionLite[], configRows);
      const partsCountByPreset = new Map<string, number>();
      for (const p of plansRes.data ?? []) {
        partsCountByPreset.set(p.id, p.parts.length);
      }

      const rows: TagliandiOverviewRow[] = configRows.map((c) => {
        const mezzo = mezzoMap.get(c.mezzo_id);
        const mezzoMeta = parseMezzoMeta(mezzo?.meta);
        const att = pickAttrezzaturaForContext(attrezzatureByMezzo.get(c.mezzo_id) ?? [], c.mezzo_id);
        const attrezzaturaLabel =
          joinMarcaModello(att?.marca, att?.modello) ??
          joinMarcaModello(mezzo?.marca_telaio as string | null, mezzo?.modello_telaio as string | null) ??
          "—";
        const telaioLabel = joinMarcaModello(
          mezzo?.marca_telaio as string | null,
          mezzo?.modello_telaio as string | null,
        );
        const metering = meteringMap.get(c.mezzo_id) ?? {
          ore: 0,
          km: null,
          source: "mezzo_meta" as const,
          confidence: "low" as const,
        };
        const currentValue = currentValueForInterval(c.interval_type, metering);
        const forecast = forecastMap.get(c.id);
        const last = lastByConfig.get(c.id);
        const urgency = computeMaintenanceUrgency({
          nextDateEstimated: forecast?.next_date_estimated ?? null,
          remainingValue: forecast?.remaining_value ?? 0,
        });
        const presetNome = resolveConfigPresetNome(c.preset_id, presetMap, c.label);

        return {
          configId: c.id,
          mezzoId: c.mezzo_id,
          presetId: c.preset_id,
          cliente: (mezzo?.cliente as string | null)?.trim() || null,
          cantiere: mezzoMeta.cantiere?.trim() || null,
          utilizzatore: (mezzo?.utilizzatore as string | null)?.trim() || null,
          numeroScuderia: (mezzo?.numero_scuderia as string | null)?.trim() || null,
          targa: (mezzo?.targa as string | null)?.trim() || null,
          matricola:
            (att?.matricola as string | null)?.trim() ||
            (mezzo?.matricola as string | null)?.trim() ||
            null,
          attrezzaturaLabel,
          telaioLabel,
          presetNome,
          intervalType: c.interval_type,
          intervalValue: Number(c.interval_value),
          intervalLabel: formatIntervalLabel(c.interval_type, Number(c.interval_value)),
          ultimoPerformedAt: last?.performed_at ?? null,
          ultimoValueAtService: last
            ? valueAtServiceForInterval(c.interval_type, {
                ore_at_service: last.ore_at_service,
                km_at_service: last.km_at_service,
              })
            : null,
          currentValue,
          remainingValue: forecast?.remaining_value ?? null,
          nextDateEstimated: forecast?.next_date_estimated ?? null,
          confidenceLevel: (forecast?.confidence_level as TagliandiOverviewRow["confidenceLevel"]) ?? null,
          confidencePct: forecast?.confidence_pct ?? null,
          confidenceReason: forecast?.confidence_reason ?? null,
          triggerReason: forecast?.trigger_reason ?? null,
          explainability: forecast?.explainability_json ?? null,
          partsCount: c.preset_id ? (partsCountByPreset.get(c.preset_id) ?? 0) : 0,
          urgency,
          canPlanWorkshop: urgency === "arancione" || urgency === "rosso",
          dueReasonLabel: formatDueReason({
            presetNome,
            explainability: forecast?.explainability_json ?? null,
            triggerReason: (forecast?.trigger_reason as TagliandiOverviewRow["triggerReason"]) ?? null,
            currentValue,
            remainingValue: forecast?.remaining_value ?? null,
            isOverdue: urgency === "rosso" || (forecast?.remaining_value != null && forecast.remaining_value <= 0),
          }),
        };
      });

      rows.sort((a, b) => {
        const scA = a.numeroScuderia ?? "";
        const scB = b.numeroScuderia ?? "";
        if (scA !== scB) {
          if (!scA) return 1;
          if (!scB) return -1;
          return scA.localeCompare(scB, "it", { numeric: true });
        }
        return (a.targa ?? "").localeCompare(b.targa ?? "", "it");
      });

      return success(rows);
    } catch (e) {
      return serviceFailFromError<TagliandiOverviewRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listPresetHierarchy(): Promise<
    ServiceResult<
      {
        id: string;
        label: string;
        sortOrder: number;
        manufacturers: {
          id: string;
          label: string;
          sortOrder: number;
          models: { id: string; label: string; sortOrder: number }[];
        }[];
      }[]
    >
  > {
    try {
      const client = await sb();
      const [catsRes, mfrRes, modelsRes] = await Promise.all([
        client
          .from("maintenance_preset_categories")
          .select(MAINTENANCE_PRESET_CATEGORIES_COLUMNS)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("maintenance_preset_manufacturers")
          .select("id, category_id, label, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("maintenance_preset_models")
          .select("id, manufacturer_id, label, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (catsRes.error) return err(humanizeGestionaleError(catsRes.error.message, { entity: "mezzo", action: "read" }));

      const modelsByMfr = new Map<string, { id: string; label: string; sortOrder: number }[]>();
      for (const m of modelsRes.data ?? []) {
        const mid = m.manufacturer_id as string;
        const list = modelsByMfr.get(mid) ?? [];
        list.push({ id: m.id as string, label: m.label as string, sortOrder: m.sort_order as number });
        modelsByMfr.set(mid, list);
      }

      const mfrByCat = new Map<string, { id: string; label: string; sortOrder: number; models: { id: string; label: string; sortOrder: number }[] }[]>();
      for (const m of mfrRes.data ?? []) {
        const cid = m.category_id as string;
        const list = mfrByCat.get(cid) ?? [];
        list.push({
          id: m.id as string,
          label: m.label as string,
          sortOrder: m.sort_order as number,
          models: modelsByMfr.get(m.id as string) ?? [],
        });
        mfrByCat.set(cid, list);
      }

      return success(
        (catsRes.data ?? []).map((c) => ({
          id: c.id as string,
          label: c.label as string,
          sortOrder: c.sort_order as number,
          manufacturers: mfrByCat.get(c.id as string) ?? [],
        })),
      );
    } catch (e) {
      return serviceFailFromError(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listMezziWithoutPreset(): Promise<ServiceResult<MezzoWithoutPresetRow[]>> {
    const res = await maintenanceEngineV2Service.listAssignableMezzi();
    if (!res.success) return err(res.error ?? "Errore mezzi.");
    return success(
      (res.data ?? [])
        .filter((m) => !m.hasActivePreset)
        .map(({ hasActivePreset: _hasActivePreset, ...row }) => row),
    );
  },

  async listAssignableMezzi(): Promise<ServiceResult<MezzoPresetAssignRow[]>> {
    try {
      const client = await sb();
      const [mezziRes, configsRes] = await Promise.all([
        client
          .from("mezzi")
          .select("id, targa, numero_scuderia, marca_telaio, modello_telaio, tipo_attrezzatura, meta")
          .is("deleted_at", null),
        client
          .from("vehicle_maintenance_configs")
          .select("mezzo_id")
          .eq("is_active", true)
          .is("deleted_at", null),
      ]);
      if (mezziRes.error) return err(humanizeGestionaleError(mezziRes.error.message, { entity: "mezzo", action: "read" }));
      if (configsRes.error) return err(humanizeGestionaleError(configsRes.error.message, { entity: "mezzo", action: "read" }));

      const withConfig = new Set((configsRes.data ?? []).map((c) => c.mezzo_id as string));
      const rows: MezzoPresetAssignRow[] = (mezziRes.data ?? [])
        .map((m) => ({
          mezzoId: m.id as string,
          numeroScuderia: (m.numero_scuderia as string | null) ?? null,
          targa: (m.targa as string | null) ?? null,
          attrezzaturaLabel: [m.marca_telaio, m.modello_telaio].filter(Boolean).join(" ") || "—",
          tipoAttrezzatura: (m.tipo_attrezzatura as string) ?? "",
          hasActivePreset: withConfig.has(m.id as string),
        }))
        .sort((a, b) => (a.numeroScuderia ?? "").localeCompare(b.numeroScuderia ?? "", "it", { numeric: true }));

      return success(rows);
    } catch (e) {
      return serviceFailFromError<MezzoPresetAssignRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async bulkAssignPresetToMezzi(input: {
    presetId: string;
    mezzoIds: string[];
    replaceExisting?: boolean;
  }): Promise<ServiceResult<BulkAssignPresetResult>> {
    const skipped: BulkAssignPresetResult["skipped"] = [];
    let assigned = 0;

    try {
      const plansRes = await maintenancePlansService.listPlans();
      if (!plansRes.success) return err(plansRes.error ?? "Errore piani.");
      const plan = (plansRes.data ?? []).find((p) => p.id === input.presetId);
      if (!plan) return err("Preset non trovato.");
      if (!isPresetAssignable(plan.status)) return err("Il preset non è attivo o non è assegnabile.");

      const triggers = plan.triggerGroups[0]?.triggers ?? [
        { triggerType: plan.intervalType, threshold: plan.intervalValue, priority: 0 },
      ];
      const primary = primaryIntervalFromTriggers(triggers);
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      for (const mezzoId of input.mezzoIds) {
        const { data: mezzo, error: mezzoErr } = await client
          .from("mezzi")
          .select("id")
          .eq("id", mezzoId)
          .maybeSingle();
        if (mezzoErr || !mezzo) {
          skipped.push({ mezzoId, reason: "Mezzo non trovato" });
          continue;
        }

        const { data: existingSame } = await client
          .from("vehicle_maintenance_configs")
          .select("id")
          .eq("mezzo_id", mezzoId)
          .eq("preset_id", input.presetId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .maybeSingle();
        if (existingSame) {
          skipped.push({ mezzoId, reason: "Preset già assegnato" });
          continue;
        }

        const upsertRes = await maintenanceEngineV2Service.upsertMezzoConfig({
          mezzoId,
          presetId: input.presetId,
          isActive: true,
          intervalType: primary.intervalType,
          intervalValue: primary.intervalValue,
          label: plan.nome,
          activatedAt: new Date().toISOString().slice(0, 10),
        });
        if (!upsertRes.success) {
          skipped.push({ mezzoId, reason: upsertRes.error ?? "Assegnazione fallita" });
          continue;
        }

        assigned++;
      }

      await writeModificaLog(client, {
        entita: "maintenance_plans",
        entita_id: input.presetId,
        azione: "UPDATE",
        payload: auditSnapshot(
          { assigned, skipped: skipped.length, mezzo_ids: input.mezzoIds },
          auditContext("bulk assign preset"),
        ),
      });
      await writeMaintenanceAuditEvent(client, {
        entity: "preset",
        entityId: input.presetId,
        action: MAINTENANCE_AUDIT_ACTIONS.PRESET_BULK_ASSIGNED,
        newValue: { assigned, skipped, mezzoIds: input.mezzoIds },
        createdBy: uid,
      });

      return success({ assigned, skipped });
    } catch (e) {
      return serviceFailFromError<BulkAssignPresetResult>(e, { assigned: 0, skipped: [] }, { entity: "mezzo", action: "update" });
    }
  },

  async listMezzoMaintenanceTimelineExtras(
    mezzoId: string,
  ): Promise<ServiceResult<import("@/lib/maintenance-plans/v2-types").MaintenanceTimelineExtraEvent[]>> {
    try {
      const client = await sb();
      const events: import("@/lib/maintenance-plans/v2-types").MaintenanceTimelineExtraEvent[] = [];

      const { data: configs } = await client
        .from("vehicle_maintenance_configs")
        .select("id")
        .eq("mezzo_id", mezzoId)
        .is("deleted_at", null);
      const configIds = (configs ?? []).map((c) => c.id as string);

      if (configIds.length > 0) {
        const { data: configAudits } = await client
          .from("maintenance_audit_events")
          .select("id, action, created_at")
          .in("entity_id", configIds)
          .in("action", ["PRESET_REPLACED_ON_MEZZO", "COMPLIANCE_REVIEWED"])
          .order("created_at", { ascending: false })
          .limit(30);
        for (const row of configAudits ?? []) {
          const action = row.action as string;
          events.push({
            id: `audit-${row.id}`,
            kind: action === "COMPLIANCE_REVIEWED" ? "compliance_reviewed" : "preset_changed",
            at: row.created_at as string,
            title: action === "COMPLIANCE_REVIEWED" ? "Compliance revisionata" : "Preset cambiato sul mezzo",
          });
        }

        const { data: forecastRows } = await client
          .from("vehicle_maintenance_forecast_history")
          .select("id, computed_at, reason")
          .in("config_id", configIds)
          .order("computed_at", { ascending: false })
          .limit(20);
        for (const row of forecastRows ?? []) {
          events.push({
            id: `fc-${row.id}`,
            kind: "forecast_recomputed",
            at: row.computed_at as string,
            title: "Forecast ricalcolato",
            subtitle: (row.reason as string | null) ?? undefined,
          });
        }
      }

      const { data: services } = await client
        .from("vehicle_maintenance_services")
        .select("id")
        .eq("mezzo_id", mezzoId)
        .is("deleted_at", null)
        .limit(100);
      const serviceIds = (services ?? []).map((s) => s.id as string);
      if (serviceIds.length > 0) {
        const { data: execAudits } = await client
          .from("maintenance_audit_events")
          .select("id, action, created_at")
          .eq("entity", "execution")
          .in("entity_id", serviceIds)
          .eq("action", "COMPLIANCE_REVIEWED")
          .order("created_at", { ascending: false })
          .limit(20);
        for (const row of execAudits ?? []) {
          events.push({
            id: `exec-audit-${row.id}`,
            kind: "compliance_reviewed",
            at: row.created_at as string,
            title: "Compliance revisionata",
          });
        }
      }

      const { data: bulkAudits } = await client
        .from("maintenance_audit_events")
        .select("id, action, created_at, new_value")
        .eq("action", "PRESET_BULK_ASSIGNED")
        .order("created_at", { ascending: false })
        .limit(50);
      for (const row of bulkAudits ?? []) {
        const mezzoIds = (row.new_value as { mezzoIds?: string[] } | null)?.mezzoIds ?? [];
        if (!mezzoIds.includes(mezzoId)) continue;
        events.push({
          id: `bulk-${row.id}`,
          kind: "preset_assigned",
          at: row.created_at as string,
          title: "Preset assegnato al mezzo",
        });
      }

      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return success(events.slice(0, 40));
    } catch (e) {
      return serviceFailFromError(e, [], { entity: "mezzo", action: "read" });
    }
  },
};
