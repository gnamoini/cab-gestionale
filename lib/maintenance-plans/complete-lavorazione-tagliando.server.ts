import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LAVORAZIONI_COLUMNS,
  MAINTENANCE_PLANS_V2_COLUMNS,
  MAINTENANCE_PRESET_CHECKLIST_COLUMNS,
  MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS,
  MAINTENANCE_PRESET_TRIGGERS_COLUMNS,
  MAINTENANCE_PRESET_VERSIONS_COLUMNS,
  SCHEDA_LAVORAZIONE_COLUMNS,
  VEHICLE_MAINTENANCE_CONFIGS_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  buildFullPresetSnapshot,
  buildMinimalPresetSnapshot,
  type FullPresetSnapshot,
} from "@/lib/maintenance-plans/build-full-preset-snapshot";
import {
  COMPLIANCE_ALGORITHM_VERSION,
  computeTagliandoCompliance,
} from "@/lib/maintenance-plans/compute-tagliando-compliance";
import { executedTasksFromSchedaRicambiContenuto } from "@/lib/maintenance-plans/executed-tasks-from-schede";
import { loadEffectivePresetForConfig } from "@/lib/maintenance-plans/load-effective-preset-for-config";
import { writeMaintenanceAuditEvent, MAINTENANCE_AUDIT_ACTIONS } from "@/lib/maintenance-plans/maintenance-audit";
import {
  computeForecastForConfig,
  forecastRowToRpcJson,
} from "@/lib/maintenance-plans/recompute-forecast-for-config";
import { SNAPSHOT_SCHEMA_VERSION } from "@/lib/maintenance-plans/build-full-preset-snapshot";
import type { MaintenanceChecklistItemView, MaintenancePresetTriggerGroupView } from "@/lib/maintenance-plans/types";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type CompleteLavorazioneTagliandoInput = {
  lavorazioneId: string;
  noPresetReason?: string;
  assignPresetId?: string;
};

export type CompleteLavorazioneTagliandoResult =
  | {
      ok: true;
      serviceId: string;
      complianceAuto: number | null;
      diffCount: number;
      snapshot: FullPresetSnapshot;
      alreadyExisted: boolean;
    }
  | { ok: false; error: string };

async function loadPresetExtras(
  client: SupabaseClient,
  presetId: string,
): Promise<{
  triggerGroups: MaintenancePresetTriggerGroupView[];
  checklist: MaintenanceChecklistItemView[];
  versionNumber: number;
  versionId: string | null;
}> {
  const [groupsRes, triggersRes, checklistRes, versionRes] = await Promise.all([
    client
      .from("maintenance_preset_trigger_groups")
      .select(MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS)
      .eq("preset_id", presetId)
      .order("sort_order"),
    client.from("maintenance_preset_triggers").select(MAINTENANCE_PRESET_TRIGGERS_COLUMNS),
    client
      .from("maintenance_preset_checklist_items")
      .select(MAINTENANCE_PRESET_CHECKLIST_COLUMNS)
      .eq("preset_id", presetId)
      .order("sort_order"),
    client
      .from("maintenance_preset_versions")
      .select(MAINTENANCE_PRESET_VERSIONS_COLUMNS)
      .eq("preset_id", presetId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const groups: MaintenancePresetTriggerGroupView[] = (groupsRes.data ?? []).map((g) => ({
    id: g.id as string,
    operator: g.operator as MaintenancePresetTriggerGroupView["operator"],
    sortOrder: g.sort_order as number,
    label: (g.label as string) ?? "",
    triggers: (triggersRes.data ?? [])
      .filter((t) => t.group_id === g.id)
      .map((t) => ({
        id: t.id as string,
        triggerType: t.trigger_type as MaintenanceIntervalType,
        threshold: Number(t.threshold),
        priority: t.priority as number,
      })),
  }));

  const checklist: MaintenanceChecklistItemView[] = (checklistRes.data ?? []).map((c) => ({
    id: c.id as string,
    label: c.label as string,
    sortOrder: c.sort_order as number,
    isRequired: c.is_required as boolean,
  }));

  return {
    triggerGroups: groups,
    checklist,
    versionNumber: Number(versionRes.data?.version_number ?? 1),
    versionId: (versionRes.data?.id as string) ?? null,
  };
}

export async function completeLavorazioneTagliando(
  input: CompleteLavorazioneTagliandoInput,
): Promise<CompleteLavorazioneTagliandoResult> {
  const client = await createSupabaseServerUserClient();
  const { data: user } = await client.auth.getUser();
  const uid = user.user?.id ?? null;

  const { data: lav, error: lavErr } = await client
    .from("lavorazioni")
    .select(
      `${LAVORAZIONI_COLUMNS}, is_tagliando, maintenance_execution_kind, repair_present, tagliando_preset_ref, tagliando_preset_version_ref, tagliando_no_preset_reason`,
    )
    .eq("id", input.lavorazioneId)
    .is("deleted_at", null)
    .maybeSingle();

  if (lavErr || !lav) return { ok: false, error: "Lavorazione non trovata." };
  if (!lav.is_tagliando) return { ok: false, error: "Lavorazione non marcata come tagliando." };

  const { data: existing } = await client
    .from("vehicle_maintenance_services")
    .select("id")
    .eq("lavorazione_id", input.lavorazioneId)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      serviceId: existing.id as string,
      complianceAuto: null,
      diffCount: 0,
      snapshot: buildMinimalPresetSnapshot(),
      alreadyExisted: true,
    };
  }

  const presetId = (input.assignPresetId ?? lav.tagliando_preset_ref) as string | null;
  let config: Record<string, unknown> | null = null;
  if (presetId) {
    const { data: cfg } = await client
      .from("vehicle_maintenance_configs")
      .select(VEHICLE_MAINTENANCE_CONFIGS_COLUMNS)
      .eq("mezzo_id", lav.mezzo_id)
      .eq("preset_id", presetId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .maybeSingle();
    config = cfg;
  }

  const { data: schede } = await client
    .from("scheda_lavorazione")
    .select(SCHEDA_LAVORAZIONE_COLUMNS)
    .eq("lavorazione_id", input.lavorazioneId);

  const schedaIngresso = (schede ?? []).find((s) => s.tipo === "ingresso");
  const schedaRicambi = (schede ?? []).find((s) => s.tipo === "ricambi");
  const ingresso = schedaIngresso?.contenuto as Record<string, unknown> | undefined;
  const ingressoCampi = (ingresso?.doc as Record<string, unknown> | undefined)?.campi as
    | Record<string, unknown>
    | undefined;
  const oreAtService = Number(ingressoCampi?.oreLavoro ?? 0);
  const kmAtService = Number(ingressoCampi?.km ?? 0) || null;
  const performedAt =
    (lav.data_uscita as string | null)?.slice(0, 10) ??
    (lav.data_ingresso as string | null)?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  let snapshot: FullPresetSnapshot;
  let planId: string | null = presetId;
  let presetVersionId: string | null = (lav.tagliando_preset_version_ref as string) ?? null;
  let intervalType: MaintenanceIntervalType = "ore";
  let intervalValue = 500;
  let configId: string | null = (config?.id as string) ?? null;

  if (presetId && config) {
    const effective = await loadEffectivePresetForConfig(client, {
      id: config.id as string,
      mezzo_id: lav.mezzo_id as string,
      preset_id: presetId,
      interval_type: config.interval_type as MaintenanceIntervalType,
      interval_value: Number(config.interval_value),
      label: (config.label as string) ?? null,
    });
    const { data: plan } = await client
      .from("maintenance_plans")
      .select(MAINTENANCE_PLANS_V2_COLUMNS)
      .eq("id", presetId)
      .maybeSingle();
    const extras = await loadPresetExtras(client, presetId);
    presetVersionId = presetVersionId ?? extras.versionId;
    intervalType = (config.interval_type as MaintenanceIntervalType) ?? "ore";
    intervalValue = Number(config.interval_value);

    snapshot = buildFullPresetSnapshot({
      name: plan?.nome as string ?? effective?.nome ?? "Preset",
      versionNumber: extras.versionNumber,
      presetRef: presetId,
      presetVersionRef: presetVersionId ?? undefined,
      parts: effective?.parts ?? [],
      checklist: extras.checklist,
      triggerGroups: extras.triggerGroups,
      maintenanceExecutionKind: lav.maintenance_execution_kind as "scheduled" | "extraordinary" | null,
      standardTimeMinutes: plan?.tempo_previsto_minuti as number | null,
      laborCostPerHour: plan?.manodopera_costo_orario as number | null,
    });
  } else {
    const reason = input.noPresetReason?.trim() || (lav.tagliando_no_preset_reason as string | null) || "";
    snapshot = buildMinimalPresetSnapshot(reason || "Completato senza preset");
    planId = null;
    configId = null;
  }

  const executedTasks = executedTasksFromSchedaRicambiContenuto(schedaRicambi?.contenuto);
  const compliance = computeTagliandoCompliance(snapshot, executedTasks);

  const oreAtServiceForRecord =
    intervalType === "km" ? Number(kmAtService ?? oreAtService) : Number(oreAtService);

  let forecastJson: Record<string, unknown> | null = null;
  const skipForecast = snapshot.forecastResetPolicy === "none" || !configId;
  if (!skipForecast && configId && config) {
    const pendingValue =
      intervalType === "km" ? Number(kmAtService ?? oreAtService) : Number(oreAtService);
    const { row } = await computeForecastForConfig(
      client,
      {
        id: configId,
        mezzo_id: lav.mezzo_id as string,
        preset_id: presetId,
        interval_type: intervalType,
        interval_value: intervalValue,
      },
      "execution_registered",
      { performedAt, valueAtService: pendingValue },
    );
    forecastJson = forecastRowToRpcJson(row);
  }

  const partsPayload = executedTasks
    .filter((t) => t.kind === "ricambio" && t.ricambioId)
    .map((t) => ({
      ricambio_id: t.ricambioId,
      quantita: t.qtyActual ?? 1,
      descrizione_snapshot: t.label,
      was_replaced: true,
      was_due: true,
      replacement_condition: "sempre",
      is_required_snapshot: false,
      note: "",
    }));

  const checklistPayload = snapshot.tasks
    .filter((t) => t.kind === "checklist")
    .map((t, idx) => ({
      item_label: t.label,
      checked: t.checked === true,
      note: "",
      sort_order: idx,
    }));

  const { data: serviceId, error: rpcErr } = await client.rpc("complete_lavorazione_tagliando", {
    p_lavorazione_id: input.lavorazioneId,
    p_mezzo_id: lav.mezzo_id,
    p_config_id: configId,
    p_plan_id: planId,
    p_performed_at: performedAt,
    p_ore_at_service: oreAtServiceForRecord,
    p_km_at_service: kmAtService,
    p_mezzo_ore_snapshot: oreAtService,
    p_note: (lav.note as string) ?? "",
    p_preset_version_id: presetVersionId,
    p_interval_type: intervalType,
    p_interval_value_at_execution: intervalValue,
    p_execution_type: "scheduled",
    p_preset_snapshot: snapshot,
    p_compliance_auto: compliance.auto,
    p_compliance_diff_json: { diffs: compliance.diffs },
    p_compliance_algorithm_version: COMPLIANCE_ALGORITHM_VERSION,
    p_snapshot_schema_version: SNAPSHOT_SCHEMA_VERSION,
    p_parts: partsPayload,
    p_checklist: checklistPayload,
    p_forecast: forecastJson,
    p_skip_forecast: skipForecast,
    p_no_preset_reason: input.noPresetReason?.trim() || null,
  });

  if (rpcErr || !serviceId) {
    return { ok: false, error: rpcErr?.message ?? "Completamento tagliando fallito." };
  }

  await writeMaintenanceAuditEvent(client, {
    entity: "execution",
    entityId: serviceId as string,
    action: MAINTENANCE_AUDIT_ACTIONS.EXECUTION_REGISTERED,
    newValue: {
      lavorazioneId: input.lavorazioneId,
      mezzoId: lav.mezzo_id,
      presetRef: presetId,
      complianceAuto: compliance.auto,
      complianceAlgorithmVersion: COMPLIANCE_ALGORITHM_VERSION,
      executionOrigin: "automatic",
    },
    createdBy: uid,
  });

  return {
    ok: true,
    serviceId: serviceId as string,
    complianceAuto: compliance.auto,
    diffCount: compliance.diffs.filter((d) => d.status !== "ok").length,
    snapshot,
    alreadyExisted: false,
  };
}
