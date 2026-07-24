import type {
  ConfidenceLevel,
  MaintenanceExecutionType,
  MaintenanceIntervalType,
  MaintenanceKind,
  MaintenanceUrgency,
  ReplacementCondition,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { PresetSnapshot } from "@/lib/maintenance-plans/preset-snapshot";
import type { ForecastExplainability } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";

export type VehicleMaintenanceConfigView = {
  id: string;
  mezzoId: string;
  presetId: string | null;
  presetVersionId: string | null;
  presetNome: string;
  maintenanceKind?: MaintenanceKind;
  isActive: boolean;
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  label: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  plannedLavorazioneId: string | null;
  ultimoPerformedAt: string | null;
  ultimoValueAtService: number | null;
  currentValue: number;
  remainingValue: number | null;
  nextDateEstimated: string | null;
  confidenceLevel: ConfidenceLevel | null;
  confidencePct: number | null;
  confidenceReason: string | null;
  triggerReason: string | null;
  explainability: ForecastExplainability | null;
  urgency: MaintenanceUrgency;
  partsCount: number;
};

export type UpsertVehicleMaintenanceConfigInput = {
  id?: string;
  mezzoId: string;
  presetId?: string | null;
  maintenanceKind?: MaintenanceKind;
  isActive: boolean;
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  label?: string;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
};

export type RegisterMaintenanceExecutionInput = {
  configId: string;
  mezzoId: string;
  planId: string;
  performedAt: string;
  oreAtService: number;
  kmAtService?: number | null;
  mezzoOreSnapshot: number | null;
  mezzoKmSnapshot?: number | null;
  note: string;
  anomalyNote?: string;
  lavorazioneId?: string | null;
  schedaLavorazioneId?: string | null;
  performedById?: string | null;
  executionType: MaintenanceExecutionType;
  presetSnapshot: PresetSnapshot;
  checklist?: { itemLabel: string; checked: boolean; note?: string; sortOrder: number }[];
  parts: {
    ricambioId: string;
    quantita: number;
    descrizioneSnapshot?: string;
    wasReplaced: boolean;
    wasDue: boolean;
    replacementCondition: ReplacementCondition;
    isRequired: boolean;
    note?: string;
  }[];
};

export type TagliandiOverviewRow = {
  configId: string;
  mezzoId: string;
  presetId: string | null;
  numeroScuderia: string | null;
  targa: string | null;
  attrezzaturaLabel: string;
  presetNome: string;
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  intervalLabel: string;
  ultimoPerformedAt: string | null;
  ultimoValueAtService: number | null;
  currentValue: number;
  remainingValue: number | null;
  nextDateEstimated: string | null;
  confidenceLevel: ConfidenceLevel | null;
  confidencePct: number | null;
  confidenceReason: string | null;
  triggerReason: string | null;
  explainability: ForecastExplainability | null;
  partsCount: number;
  urgency: MaintenanceUrgency;
  canPlanWorkshop: boolean;
  dueReasonLabel: string;
};

export type MezzoWithoutPresetRow = {
  mezzoId: string;
  numeroScuderia: string | null;
  targa: string | null;
  attrezzaturaLabel: string;
  tipoAttrezzatura: string;
};

export type BulkAssignPresetResult = {
  assigned: number;
  skipped: { mezzoId: string; reason: string }[];
};

export type PresetHierarchyCategory = {
  id: string;
  label: string;
  sortOrder: number;
  manufacturers: {
    id: string;
    label: string;
    sortOrder: number;
    models: { id: string; label: string; sortOrder: number }[];
  }[];
};

export type MaintenancePresetVersionView = {
  id: string;
  presetId: string;
  versionNumber: number;
  manualName: string | null;
  manufacturerRef: string | null;
  revision: string | null;
  pageRef: string | null;
  documentId: string | null;
  changeNote: string | null;
  createdAt: string;
};

export type MezzoMaintenanceKpi = {
  costoAnnuale: number;
  oreTraTagliandi: number | null;
  puntualitaPct: number | null;
  mediaRitardoGiorni: number | null;
  costoPerOra: number | null;
};

export type PresetMaintenanceKpi = {
  costoMedio: number;
  durataMediaGiorni: number | null;
  deviazioneStdGiorni: number | null;
  ricambiTop: { ricambioId: string; descrizione: string; count: number }[];
};

export type OfficinaMaintenanceKpi = {
  tagliandiEseguiti: number;
  previsti30Giorni: number;
  scaduti: number;
  ricambiDaPreparare: number;
};

export type { EffectivePart };
