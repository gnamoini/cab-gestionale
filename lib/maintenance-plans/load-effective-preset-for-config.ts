import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAINTENANCE_PLAN_PARTS_V2_COLUMNS,
  MAINTENANCE_PLANS_V2_COLUMNS,
  MAGAZZINO_RICAMBI_COLUMNS,
} from "@/lib/db/table-select-columns";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { isPartDue } from "@/lib/maintenance-plans/part-replacement-condition";
import {
  resolveEffectivePreset,
  type EffectivePart,
  type EffectivePreset,
  type PresetPartSource,
} from "@/lib/maintenance-plans/resolve-effective-preset";

type ConfigLike = {
  id: string;
  mezzo_id: string;
  preset_id: string | null;
  interval_type: MaintenanceIntervalType;
  interval_value: number;
  label: string | null;
};

async function loadPlanParts(
  client: SupabaseClient,
  planId: string,
): Promise<PresetPartSource[]> {
  const [partsRes, ricambiRes] = await Promise.all([
    client
      .from("maintenance_plan_parts")
      .select(MAINTENANCE_PLAN_PARTS_V2_COLUMNS)
      .eq("plan_id", planId),
    client.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS),
  ]);
  if (partsRes.error || !partsRes.data?.length) return [];

  const ricambi = new Map((ricambiRes.data ?? []).map((r) => [r.id as string, r]));
  return partsRes.data.map((p) => {
    const r = ricambi.get(p.ricambio_id as string);
    return {
      ricambioId: p.ricambio_id as string,
      codice: (r?.codice as string) ?? "—",
      descrizione: (r?.nome as string) ?? "—",
      quantita: Number(p.quantita),
      isRequired: p.is_required as boolean | undefined,
      replacementCondition: p.replacement_condition as PresetPartSource["replacementCondition"],
      conditionParams: (p.condition_params as Record<string, number> | null) ?? null,
      sortOrder: p.sort_order as number | undefined,
      note: (p.note as string) ?? "",
    };
  });
}

async function loadVehicleOverrideParts(
  client: SupabaseClient,
  parentPresetId: string,
  mezzoId: string,
): Promise<PresetPartSource[]> {
  const { data: override } = await client
    .from("maintenance_preset_overrides")
    .select("child_preset_id")
    .eq("parent_preset_id", parentPresetId)
    .eq("mezzo_id", mezzoId)
    .eq("scope", "vehicle")
    .maybeSingle();
  if (!override?.child_preset_id) return [];
  return loadPlanParts(client, override.child_preset_id as string);
}

async function loadModelOverrideParts(
  client: SupabaseClient,
  parentPresetId: string,
  mezzoId: string,
): Promise<PresetPartSource[]> {
  const { data: mezzo } = await client.from("mezzi").select("modello_telaio, marca_telaio").eq("id", mezzoId).maybeSingle();
  if (!mezzo) return [];

  const { data: models } = await client
    .from("maintenance_preset_models")
    .select("id, label")
    .eq("is_active", true);
  const modelLabel = [mezzo.marca_telaio, mezzo.modello_telaio].filter(Boolean).join(" ").trim().toLowerCase();
  const model = (models ?? []).find((m) => (m.label as string).toLowerCase() === modelLabel);
  if (!model) return [];

  const { data: override } = await client
    .from("maintenance_preset_overrides")
    .select("child_preset_id")
    .eq("parent_preset_id", parentPresetId)
    .eq("model_id", model.id)
    .eq("scope", "model")
    .maybeSingle();
  if (!override?.child_preset_id) return [];
  return loadPlanParts(client, override.child_preset_id as string);
}

export async function loadEffectivePresetForConfig(
  client: SupabaseClient,
  config: ConfigLike,
): Promise<EffectivePreset | null> {
  if (!config.preset_id) {
    return {
      presetId: config.id,
      nome: config.label?.trim() || "Custom",
      intervalType: config.interval_type,
      intervalValue: Number(config.interval_value),
      parts: [],
    };
  }

  const { data: plan } = await client
    .from("maintenance_plans")
    .select(MAINTENANCE_PLANS_V2_COLUMNS)
    .eq("id", config.preset_id)
    .maybeSingle();
  if (!plan) return null;

  const [baseParts, vehicleOverrideParts, modelOverrideParts] = await Promise.all([
    loadPlanParts(client, config.preset_id),
    loadVehicleOverrideParts(client, config.preset_id, config.mezzo_id),
    loadModelOverrideParts(client, config.preset_id, config.mezzo_id),
  ]);

  return resolveEffectivePreset({
    presetId: config.preset_id,
    presetNome: config.label?.trim() || (plan.nome as string),
    intervalType: config.interval_type,
    intervalValue: Number(config.interval_value),
    baseParts,
    vehicleOverrideParts,
    modelOverrideParts,
  });
}

export function effectivePartsForRegistration(
  preset: EffectivePreset,
  executionCount: number,
): EffectivePart[] {
  return preset.parts.filter((p) =>
    isPartDue({
      condition: p.replacementCondition,
      conditionParams: p.conditionParams,
      executionCount,
      oreSinceLastReplace: null,
      kmSinceLastReplace: null,
    }),
  );
}
