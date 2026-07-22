import type {
  MaintenanceChecklistItemView,
  MaintenancePlanView,
  MaintenancePresetTriggerView,
  UpsertMaintenancePlanInput,
} from "@/lib/maintenance-plans/types";
import type { MaintenancePresetPartDraft } from "@/components/gestionale/maintenance/maintenance-preset-parts-field";
import { primaryIntervalFromTriggers } from "@/lib/maintenance-plans/maintenance-trigger-helpers";

export type PlanDraft = UpsertMaintenancePlanInput & {
  partsDraft: MaintenancePresetPartDraft[];
  triggersDraft: MaintenancePresetTriggerView[];
  checklistDraft: MaintenanceChecklistItemView[];
  assignedMezziCount?: number;
};

export function emptyPlanDraft(): PlanDraft {
  return {
    nome: "",
    intervalOre: 500,
    intervalType: "ore",
    intervalValue: 500,
    status: "active",
    isActive: true,
    tipoAttrezzaturaIds: [],
    parts: [],
    partsDraft: [],
    triggersDraft: [{ triggerType: "ore", threshold: 500, priority: 0 }],
    checklistDraft: [],
    tempoPrevistoMinuti: null,
  };
}

export function planToDraft(plan: MaintenancePlanView, assignedMezziCount = 0): PlanDraft {
  const triggers =
    plan.triggerGroups[0]?.triggers?.length > 0
      ? plan.triggerGroups[0]!.triggers
      : [{ triggerType: plan.intervalType, threshold: plan.intervalValue, priority: 0 }];
  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.intervalOre,
    intervalType: plan.intervalType,
    intervalValue: plan.intervalValue,
    maintenanceKind: plan.maintenanceKind,
    status: plan.status,
    isActive: plan.isActive,
    tempoPrevistoMinuti: plan.tempoPrevistoMinuti,
    manodoperaCostoOrario: plan.manodoperaCostoOrario,
    tipoAttrezzaturaIds: [...plan.tipoIds],
    parts: plan.parts.map((p) => ({
      ricambioId: p.ricambioId,
      quantita: p.quantita,
      isRequired: p.isRequired,
      replacementCondition: p.replacementCondition,
      note: p.note,
    })),
    partsDraft: plan.parts.map((p) => ({
      ricambioId: p.ricambioId,
      codice: p.codice,
      descrizione: p.descrizione,
      quantita: p.quantita,
      isRequired: p.isRequired,
      replacementCondition: p.replacementCondition,
      note: p.note,
    })),
    triggersDraft: triggers,
    checklistDraft: [...plan.checklist],
    triggerGroups: plan.triggerGroups,
    checklist: plan.checklist,
    assignedMezziCount,
  };
}

export function planDraftToUpsertInput(draft: PlanDraft): UpsertMaintenancePlanInput {
  const primary = primaryIntervalFromTriggers(draft.triggersDraft);

  return {
    id: draft.id,
    nome: draft.nome.trim(),
    intervalOre: primary.intervalOre,
    intervalType: primary.intervalType,
    intervalValue: primary.intervalValue,
    maintenanceKind: draft.maintenanceKind,
    status: draft.status,
    isActive: draft.status === "active",
    tempoPrevistoMinuti: draft.tempoPrevistoMinuti,
    manodoperaCostoOrario: draft.manodoperaCostoOrario,
    tipoAttrezzaturaIds: draft.tipoAttrezzaturaIds,
    parts: draft.partsDraft.map((p) => ({
      ricambioId: p.ricambioId,
      quantita: p.quantita,
      isRequired: p.isRequired,
      replacementCondition: p.replacementCondition,
      note: p.note,
    })),
    triggerGroups: [
      {
        operator: "OR",
        sortOrder: 0,
        label: "Intervallo principale",
        triggers: draft.triggersDraft,
      },
    ],
    checklist: draft.checklistDraft,
  };
}
