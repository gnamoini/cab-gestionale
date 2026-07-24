/**
 * ponytail: dominio separato da asset_compliance (revisioni/assicurazioni/calendario).
 * Qui: tagliandi operativi con piani centralizzati per tipo attrezzatura.
 */

import type {
  MaintenanceExecutionType,
  MaintenanceIntervalType,
  MaintenanceKind,
  MaintenancePresetStatus,
  MaintenanceTriggerGroupOperator,
  ReplacementCondition,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { PresetSnapshot } from "@/lib/maintenance-plans/preset-snapshot";

export type MaintenancePlanStatus = {
  planId: string;
  planNome: string;
  intervalOre: number;
  ultimoOre: number | null;
  prossimoOre: number;
  oreMancanti: number;
};

export type MaintenancePlanPartView = {
  id: string;
  ricambioId: string;
  codice: string;
  descrizione: string;
  quantita: number;
  isRequired: boolean;
  replacementCondition: ReplacementCondition;
  conditionParams: Record<string, number> | null;
  sortOrder: number;
  note: string;
};

export type MaintenancePresetTriggerView = {
  id?: string;
  triggerType: MaintenanceIntervalType;
  threshold: number;
  priority: number;
};

export type MaintenancePresetTriggerGroupView = {
  id?: string;
  operator: MaintenanceTriggerGroupOperator;
  sortOrder: number;
  label: string;
  triggers: MaintenancePresetTriggerView[];
};

export type MaintenanceChecklistItemView = {
  id?: string;
  label: string;
  sortOrder: number;
  isRequired: boolean;
};

export type MaintenancePlanView = {
  id: string;
  nome: string;
  intervalOre: number;
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  maintenanceKind: MaintenanceKind;
  status: MaintenancePresetStatus;
  isActive: boolean;
  tempoPrevistoMinuti: number | null;
  manodoperaCostoOrario: number | null;
  tipoLabels: string[];
  tipoIds: string[];
  parts: MaintenancePlanPartView[];
  triggerGroups: MaintenancePresetTriggerGroupView[];
  checklist: MaintenanceChecklistItemView[];
  currentVersionId: string | null;
};

export type MaintenanceServicePartView = {
  ricambioId: string;
  descrizione: string;
  quantita: number;
  wasReplaced: boolean;
  wasDue: boolean;
  isRequired: boolean;
  replacementCondition: ReplacementCondition;
};

export type MaintenanceServiceChecklistItemView = {
  itemLabel: string;
  checked: boolean;
  note: string;
};

export type MaintenanceServiceHistoryView = {
  id: string;
  planId: string;
  planNome: string;
  performedAt: string;
  oreAtService: number;
  kmAtService: number | null;
  mezzoOreSnapshot: number | null;
  note: string;
  performedByName: string;
  executionType: MaintenanceExecutionType;
  presetSnapshot: PresetSnapshot | null;
  parts: MaintenanceServicePartView[];
  checklist: MaintenanceServiceChecklistItemView[];
};

export type RegisterMaintenanceServiceInput = {
  mezzoId: string;
  planId: string;
  performedAt: string;
  oreAtService: number;
  kmAtService?: number | null;
  mezzoOreSnapshot: number | null;
  note: string;
  executionType: MaintenanceExecutionType;
  presetSnapshot: PresetSnapshot;
  checklist?: { itemLabel: string; checked: boolean; note?: string; sortOrder: number }[];
  parts: {
    ricambioId: string;
    quantita: number;
    descrizioneSnapshot?: string;
    wasReplaced?: boolean;
    wasDue?: boolean;
    replacementCondition?: ReplacementCondition;
    isRequired?: boolean;
  }[];
};

export type UpsertMaintenancePlanPartInput = {
  ricambioId: string;
  quantita: number;
  isRequired?: boolean;
  replacementCondition?: ReplacementCondition;
  conditionParams?: Record<string, number> | null;
  sortOrder?: number;
  note?: string;
};

export type UpsertMaintenancePlanInput = {
  id?: string;
  nome: string;
  intervalOre: number;
  intervalType?: MaintenanceIntervalType;
  intervalValue?: number;
  maintenanceKind?: MaintenanceKind;
  status?: MaintenancePresetStatus;
  isActive: boolean;
  tempoPrevistoMinuti?: number | null;
  manodoperaCostoOrario?: number | null;
  tipoAttrezzaturaIds?: string[];
  parts: UpsertMaintenancePlanPartInput[];
  triggerGroups?: MaintenancePresetTriggerGroupView[];
  checklist?: MaintenanceChecklistItemView[];
};

export type MaintenancePresetSummary = MaintenancePlanView & {
  triggerSummary: string;
  assignedMezziCount: number;
  executionsCount: number;
};
