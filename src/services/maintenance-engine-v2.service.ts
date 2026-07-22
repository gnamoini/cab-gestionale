"use client";

import { computeMaintenanceUrgency } from "@/lib/maintenance-plans/compute-maintenance-urgency";
import {
  MAINTENANCE_PRESET_CATEGORIES_COLUMNS,
  VEHICLE_MAINTENANCE_CONFIGS_COLUMNS,
  VEHICLE_MAINTENANCE_FORECASTS_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICES_V2_COLUMNS,
} from "@/lib/db/table-select-columns";
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
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import {
  currentValueForInterval,
  formatIntervalLabel,
  type MezzoMetering,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";
import type {
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
  services: { config_id: string | null; performed_at: string; ore_at_service: number; km_at_service: number | null }[],
): Map<string, LastServiceRow> {
  const lastByConfig = new Map<string, LastServiceRow>();
  for (const s of services) {
    const cid = s.config_id;
    if (!cid || lastByConfig.has(cid)) continue;
    lastByConfig.set(cid, {
      performed_at: s.performed_at,
      ore_at_service: Number(s.ore_at_service),
      km_at_service: s.km_at_service != null ? Number(s.km_at_service) : null,
    });
  }
  return lastByConfig;
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
    label: c.label?.trim() ?? presetNome,
    activatedAt: c.activated_at,
    deactivatedAt: c.deactivated_at,
    plannedLavorazioneId: c.planned_lavorazione_id,
    ultimoPerformedAt: lastService?.performed_at ?? null,
    ultimoValueAtService:
      c.interval_type === "km"
        ? (lastService?.km_at_service ?? lastService?.ore_at_service ?? null)
        : (lastService?.ore_at_service ?? null),
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
      .select("config_id, performed_at, ore_at_service, km_at_service")
      .in("config_id", configIds)
      .order("performed_at", { ascending: false }),
    presetIds.length > 0
      ? client.from("maintenance_plans").select("id, nome").in("id", presetIds)
      : Promise.resolve({ data: [], error: null }),
    maintenancePlansService.listPlans(),
  ]);

  const forecastMap = new Map((forecastsRes.data ?? []).map((f) => [(f as ForecastRow).config_id, f as ForecastRow]));
  const lastMap = buildLastServiceMap(servicesRes.data ?? []);
  const presetMap = new Map((presetsRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
  const partsCountByPreset = new Map<string, number>();
  for (const p of plansRes.data ?? []) {
    partsCountByPreset.set(p.id, p.parts.length);
  }

  return configs.map((c) => {
    const presetNome = c.label?.trim() || (c.preset_id ? presetMap.get(c.preset_id) ?? "—" : "Custom");
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
    tipoAttrezzatura: string;
    tagliandiEnabled?: boolean;
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

      let configs = (data ?? []) as ConfigRow[];
      if (configs.length === 0) {
        await maintenanceEngineV2Service.ensureMezzoConfigsFromLegacy({
          mezzoId: input.mezzoId,
          tipoAttrezzatura: input.tipoAttrezzatura,
        });
        const retry = await client
          .from("vehicle_maintenance_configs")
          .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
          .eq("mezzo_id", input.mezzoId)
          .is("deleted_at", null);
        if (retry.error) return err(humanizeGestionaleError(retry.error.message, { entity: "mezzo", action: "read" }));
        configs = (retry.data ?? []) as ConfigRow[];
      }

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

  async ensureMezzoConfigsFromLegacy(input: {
    mezzoId: string;
    tipoAttrezzatura: string;
  }): Promise<ServiceResult<number>> {
    try {
      const [plansRes, catalogRes] = await Promise.all([
        maintenancePlansService.listPlans(),
        maintenancePlansService.listTipoCatalog(),
      ]);
      if (!plansRes.success) return err(plansRes.error ?? "Errore piani.");
      const catalog = catalogRes.data ?? [];
      const applicable = resolvePlansForMezzo({
        tipoAttrezzatura: input.tipoAttrezzatura,
        catalog,
        plans: plansRes.data ?? [],
      });
      if (applicable.length === 0) return success(0);

      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;
      let created = 0;

      for (const plan of applicable) {
        const { data: existing } = await client
          .from("vehicle_maintenance_configs")
          .select("id")
          .eq("mezzo_id", input.mezzoId)
          .eq("preset_id", plan.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) continue;

        const { data: version } = await client
          .from("maintenance_preset_versions")
          .select("id")
          .eq("preset_id", plan.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: inserted, error } = await client
          .from("vehicle_maintenance_configs")
          .insert({
            mezzo_id: input.mezzoId,
            preset_id: plan.id,
            preset_version_id: version?.id ?? null,
            maintenance_kind: "tagliando_ore",
            is_active: true,
            interval_type: "ore",
            interval_value: plan.intervalOre,
            label: plan.nome,
            activated_at: new Date().toISOString().slice(0, 10),
            created_by: uid,
          })
          .select("id")
          .maybeSingle();
        if (!error && inserted) {
          created++;
          await client
            .from("vehicle_maintenance_services")
            .update({ config_id: inserted.id })
            .eq("mezzo_id", input.mezzoId)
            .eq("plan_id", plan.id)
            .is("config_id", null);
        }
      }
      return success(created);
    } catch (e) {
      return serviceFailFromError<number>(e, 0, { entity: "mezzo", action: "create" });
    }
  },

  async upsertMezzoConfig(input: UpsertVehicleMaintenanceConfigInput): Promise<ServiceResult<VehicleMaintenanceConfigView>> {
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      const payload = {
        mezzo_id: input.mezzoId,
        preset_id: input.presetId ?? null,
        maintenance_kind: input.maintenanceKind,
        is_active: input.isActive,
        interval_type: input.intervalType,
        interval_value: input.intervalValue,
        label: input.label?.trim() || null,
        activated_at: input.activatedAt ?? null,
        deactivated_at: input.deactivatedAt ?? null,
      };

      let configId = input.id;
      if (configId) {
        const { error } = await client
          .from("vehicle_maintenance_configs")
          .update(payload)
          .eq("id", configId);
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      } else {
        if (input.presetId) {
          const { data: version } = await client
            .from("maintenance_preset_versions")
            .select("id")
            .eq("preset_id", input.presetId)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();
          (payload as Record<string, unknown>).preset_version_id = version?.id ?? null;
        }
        const { data: row, error } = await client
          .from("vehicle_maintenance_configs")
          .insert({ ...payload, created_by: uid })
          .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
          .single();
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
        configId = (row as ConfigRow).id;
        await writeModificaLog(client, {
          entita: ENTITA_CONFIG,
          entita_id: configId,
          azione: "CREATE",
          payload: auditSnapshot(row, auditContext(input.label ?? "config")),
        });
      }

      await maintenanceEngineV2Service.recomputeForecast(configId!);

      const listed = await maintenanceEngineV2Service.listMezzoConfigs({
        mezzoId: input.mezzoId,
        tipoAttrezzatura: "",
      });
      if (!listed.success) return err(listed.error ?? "Errore ricaricamento.");
      const view = (listed.data ?? []).find((c) => c.id === configId);
      if (!view) return err("Config non trovata dopo salvataggio.");
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

      const [mezziRes, presetsRes, forecastsRes, lastServicesRes, meteringMap, plansRes] = await Promise.all([
        client.from("mezzi").select("id, targa, numero_scuderia, marca_telaio, modello_telaio").in("id", mezzoIds),
        presetIds.length > 0
          ? client.from("maintenance_plans").select("id, nome").in("id", presetIds)
          : Promise.resolve({ data: [], error: null }),
        client.from("vehicle_maintenance_forecasts").select(VEHICLE_MAINTENANCE_FORECASTS_COLUMNS).in("config_id", configIds),
        client
          .from("vehicle_maintenance_services")
          .select("config_id, performed_at, ore_at_service, km_at_service")
          .in("config_id", configIds)
          .order("performed_at", { ascending: false }),
        resolveCurrentMezzoMeteringBatch(client, mezzoIds),
        maintenancePlansService.listPlans(),
      ]);

      if (mezziRes.error) return err(humanizeGestionaleError(mezziRes.error.message, { entity: "mezzo", action: "read" }));

      const mezzoMap = new Map((mezziRes.data ?? []).map((m) => [m.id as string, m]));
      const presetMap = new Map((presetsRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
      const forecastMap = new Map((forecastsRes.data ?? []).map((f) => [(f as ForecastRow).config_id, f as ForecastRow]));
      const lastByConfig = buildLastServiceMap(lastServicesRes.data ?? []);
      const partsCountByPreset = new Map<string, number>();
      for (const p of plansRes.data ?? []) {
        partsCountByPreset.set(p.id, p.parts.length);
      }

      const rows: TagliandiOverviewRow[] = configRows.map((c) => {
        const mezzo = mezzoMap.get(c.mezzo_id);
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

        return {
          configId: c.id,
          mezzoId: c.mezzo_id,
          numeroScuderia: (mezzo?.numero_scuderia as string | null) ?? null,
          targa: (mezzo?.targa as string | null) ?? null,
          attrezzaturaLabel: [mezzo?.marca_telaio, mezzo?.modello_telaio].filter(Boolean).join(" ") || "—",
          presetNome: c.label?.trim() || (c.preset_id ? presetMap.get(c.preset_id) ?? "—" : "Custom"),
          intervalType: c.interval_type,
          intervalValue: Number(c.interval_value),
          intervalLabel: formatIntervalLabel(c.interval_type, Number(c.interval_value)),
          ultimoPerformedAt: last?.performed_at ?? null,
          ultimoValueAtService:
            c.interval_type === "km"
              ? (last?.km_at_service ?? last?.ore_at_service ?? null)
              : (last?.ore_at_service ?? null),
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
};
