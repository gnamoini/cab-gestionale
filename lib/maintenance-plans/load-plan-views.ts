import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS,
  MAINTENANCE_PLAN_PARTS_COLUMNS,
  MAINTENANCE_PLANS_COLUMNS,
  MAINTENANCE_PRESET_CHECKLIST_COLUMNS,
  MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS,
  MAINTENANCE_PRESET_TRIGGERS_COLUMNS,
} from "@/lib/db/table-select-columns";
import type {
  MaintenanceIntervalType,
  MaintenanceKind,
  MaintenancePresetStatus,
} from "@/lib/maintenance-plans/maintenance-enums";
import type {
  MaintenanceChecklistItemView,
  MaintenancePlanView,
  MaintenancePresetTriggerGroupView,
} from "@/lib/maintenance-plans/types";
import type {
  MaintenancePlanEquipmentTypeRow,
  MaintenancePlanPartRow,
  MaintenancePlanRow,
  MagazzinoRicambioRow,
  TipoAttrezzaturaCatalogRow,
} from "@/src/types/supabase-tables";

type RicambioLite = Pick<MagazzinoRicambioRow, "id" | "codice" | "nome">;

export async function loadMaintenancePlanViews(client: SupabaseClient): Promise<MaintenancePlanView[]> {
  const [plansRes, eqRes, catRes, partsRes, groupsRes, triggersRes, checklistRes] = await Promise.all([
    client.from("maintenance_plans").select(MAINTENANCE_PLANS_COLUMNS).is("deleted_at", null).order("nome"),
    client.from("maintenance_plan_equipment_types").select(MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS),
    client.from("tipi_attrezzatura_catalog").select("id, label, label_norm, created_at, updated_at"),
    client.from("maintenance_plan_parts").select(MAINTENANCE_PLAN_PARTS_COLUMNS),
    client.from("maintenance_preset_trigger_groups").select(MAINTENANCE_PRESET_TRIGGER_GROUPS_COLUMNS),
    client.from("maintenance_preset_triggers").select(MAINTENANCE_PRESET_TRIGGERS_COLUMNS),
    client.from("maintenance_preset_checklist_items").select(MAINTENANCE_PRESET_CHECKLIST_COLUMNS),
  ]);

  if (plansRes.error) throw plansRes.error;
  const plans = (plansRes.data ?? []) as MaintenancePlanRow[];
  const equipmentTypes = (eqRes.data ?? []) as MaintenancePlanEquipmentTypeRow[];
  const catalog = (catRes.data ?? []) as TipoAttrezzaturaCatalogRow[];
  const parts = (partsRes.data ?? []) as MaintenancePlanPartRow[];

  const ricambioIds = [...new Set(parts.map((p) => p.ricambio_id))];
  let ricambi: RicambioLite[] = [];
  if (ricambioIds.length > 0) {
    const { data: ricData } = await client.from("magazzino_ricambi").select("id, codice, nome").in("id", ricambioIds);
    ricambi = (ricData ?? []) as RicambioLite[];
  }

  const groupsByPreset = new Map<string, MaintenancePresetTriggerGroupView[]>();
  for (const g of groupsRes.data ?? []) {
    const presetId = g.preset_id as string;
    const list = groupsByPreset.get(presetId) ?? [];
    list.push({
      id: g.id as string,
      operator: g.operator as MaintenancePresetTriggerGroupView["operator"],
      sortOrder: g.sort_order as number,
      label: (g.label as string) ?? "",
      triggers: [],
    });
    groupsByPreset.set(presetId, list);
  }
  const groupIdToPreset = new Map<string, string>();
  for (const [presetId, groups] of groupsByPreset) {
    for (const g of groups) {
      if (g.id) groupIdToPreset.set(g.id, presetId);
    }
  }
  for (const t of triggersRes.data ?? []) {
    const groupId = t.group_id as string;
    const presetId = groupIdToPreset.get(groupId);
    if (!presetId) continue;
    const groups = groupsByPreset.get(presetId) ?? [];
    const group = groups.find((x) => x.id === groupId);
    group?.triggers.push({
      id: t.id as string,
      triggerType: t.trigger_type as MaintenanceIntervalType,
      threshold: Number(t.threshold),
      priority: t.priority as number,
    });
  }

  const checklistByPreset = new Map<string, MaintenanceChecklistItemView[]>();
  for (const c of checklistRes.data ?? []) {
    const presetId = c.preset_id as string;
    const list = checklistByPreset.get(presetId) ?? [];
    list.push({
      id: c.id as string,
      label: c.label as string,
      sortOrder: c.sort_order as number,
      isRequired: c.is_required as boolean,
    });
    checklistByPreset.set(presetId, list);
  }

  return plans.map((plan) => mapPlanView(plan, equipmentTypes, catalog, parts, ricambi, groupsByPreset, checklistByPreset));
}

function mapPlanView(
  plan: MaintenancePlanRow,
  equipmentTypes: MaintenancePlanEquipmentTypeRow[],
  catalog: TipoAttrezzaturaCatalogRow[],
  parts: MaintenancePlanPartRow[],
  ricambi: RicambioLite[],
  groupsByPreset: Map<string, MaintenancePresetTriggerGroupView[]>,
  checklistByPreset: Map<string, MaintenanceChecklistItemView[]>,
): MaintenancePlanView {
  const tipoIds = equipmentTypes.filter((e) => e.plan_id === plan.id).map((e) => e.tipo_attrezzatura_id);
  const tipoLabels = tipoIds
    .map((id) => catalog.find((c) => c.id === id)?.label)
    .filter((x): x is string => Boolean(x));
  const intervalType = (plan.interval_type as MaintenanceIntervalType) ?? "ore";
  const intervalValue = Number(plan.interval_value ?? plan.interval_ore);
  const status = (plan.status as MaintenancePresetStatus) ?? (plan.is_active ? "active" : "archived");

  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.interval_ore,
    intervalType,
    intervalValue,
    maintenanceKind: (plan.maintenance_kind as MaintenanceKind) ?? "tagliando_ore",
    status,
    isActive: plan.is_active && plan.deleted_at == null && status === "active",
    tempoPrevistoMinuti: plan.tempo_previsto_minuti != null ? Number(plan.tempo_previsto_minuti) : null,
    manodoperaCostoOrario: plan.manodopera_costo_orario != null ? Number(plan.manodopera_costo_orario) : null,
    tipoLabels,
    tipoIds,
    currentVersionId: plan.current_version_id ?? null,
    parts: parts
      .filter((p) => p.plan_id === plan.id)
      .map((p) => {
        const r = ricambi.find((x) => x.id === p.ricambio_id);
        return {
          id: p.id,
          ricambioId: p.ricambio_id,
          codice: r?.codice ?? "—",
          descrizione: r?.nome ?? "—",
          quantita: Number(p.quantita),
          isRequired: p.is_required ?? true,
          replacementCondition: (p.replacement_condition as MaintenancePlanView["parts"][0]["replacementCondition"]) ?? "sempre",
          conditionParams: p.condition_params ?? null,
          sortOrder: p.sort_order ?? 0,
          note: p.note?.trim() ?? "",
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder),
    triggerGroups: (groupsByPreset.get(plan.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    checklist: (checklistByPreset.get(plan.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function persistPlanTriggerGroups(
  client: SupabaseClient,
  planId: string,
  groups: MaintenancePresetTriggerGroupView[],
): Promise<void> {
  const { data: existingGroups } = await client
    .from("maintenance_preset_trigger_groups")
    .select("id")
    .eq("preset_id", planId);
  const existingIds = (existingGroups ?? []).map((g) => g.id as string);
  if (existingIds.length > 0) {
    await client.from("maintenance_preset_triggers").delete().in("group_id", existingIds);
    await client.from("maintenance_preset_trigger_groups").delete().eq("preset_id", planId);
  }

  const normalized =
    groups.length > 0
      ? groups
      : [
          {
            operator: "OR" as const,
            sortOrder: 0,
            label: "Intervallo principale",
            triggers: [{ triggerType: "ore" as const, threshold: 500, priority: 0 }],
          },
        ];

  for (const group of normalized) {
    const { data: gRow, error: gErr } = await client
      .from("maintenance_preset_trigger_groups")
      .insert({
        preset_id: planId,
        operator: group.operator,
        sort_order: group.sortOrder,
        label: group.label?.trim() || null,
      })
      .select("id")
      .single();
    if (gErr || !gRow) throw gErr ?? new Error("Trigger group insert failed");

    if (group.triggers.length > 0) {
      const { error: tErr } = await client.from("maintenance_preset_triggers").insert(
        group.triggers.map((t) => ({
          group_id: gRow.id,
          trigger_type: t.triggerType,
          threshold: t.threshold,
          priority: t.priority,
        })),
      );
      if (tErr) throw tErr;
    }
  }
}

export async function persistPlanChecklist(
  client: SupabaseClient,
  planId: string,
  items: MaintenanceChecklistItemView[],
): Promise<void> {
  await client.from("maintenance_preset_checklist_items").delete().eq("preset_id", planId);
  if (items.length === 0) return;
  const { error } = await client.from("maintenance_preset_checklist_items").insert(
    items.map((item, idx) => ({
      preset_id: planId,
      label: item.label.trim(),
      sort_order: item.sortOrder ?? idx,
      is_required: item.isRequired,
    })),
  );
  if (error) throw error;
}
