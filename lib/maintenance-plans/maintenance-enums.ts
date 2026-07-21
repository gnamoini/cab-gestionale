/**
 * SSOT enums — Maintenance Planning Engine v2
 */

export const MAINTENANCE_INTERVAL_TYPES = ["ore", "km", "giorni", "mesi"] as const;
export type MaintenanceIntervalType = (typeof MAINTENANCE_INTERVAL_TYPES)[number];

export const MAINTENANCE_PRESET_STATUSES = ["active", "draft", "archived"] as const;
export type MaintenancePresetStatus = (typeof MAINTENANCE_PRESET_STATUSES)[number];

export const MAINTENANCE_EXECUTION_TYPES = ["scheduled", "corrective", "manual", "emergency"] as const;
export type MaintenanceExecutionType = (typeof MAINTENANCE_EXECUTION_TYPES)[number];

export const MAINTENANCE_TRIGGER_GROUP_OPERATORS = ["OR", "AND"] as const;
export type MaintenanceTriggerGroupOperator = (typeof MAINTENANCE_TRIGGER_GROUP_OPERATORS)[number];

export const MAINTENANCE_WAREHOUSE_STATUSES = ["pending", "reserved", "issued", "skipped", "completed", "failed", "ignored"] as const;
export type MaintenanceWarehouseStatus = (typeof MAINTENANCE_WAREHOUSE_STATUSES)[number];

export const MAINTENANCE_KINDS = [
  "tagliando_ore",
  "tagliando_km",
  "revisione",
  "controllo_idraulico",
  "filtri",
  "custom",
] as const;
export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number];

export const REPLACEMENT_CONDITIONS = [
  "sempre",
  "solo_se_usurato",
  "solo_se_contaminato",
  "ogni_n_tagliandi",
  "ogni_n_ore",
  "ogni_n_km",
] as const;
export type ReplacementCondition = (typeof REPLACEMENT_CONDITIONS)[number];

export const CONFIDENCE_LEVELS = ["alta", "media", "bassa"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const MAINTENANCE_URGENCY = ["verde", "giallo", "arancione", "rosso"] as const;
export type MaintenanceUrgency = (typeof MAINTENANCE_URGENCY)[number];

export const FORECAST_ENGINE_VERSION = "v2.0";

export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  tagliando_ore: "Tagliando ore",
  tagliando_km: "Tagliando km",
  revisione: "Revisione",
  controllo_idraulico: "Controllo idraulico",
  filtri: "Filtri",
  custom: "Personalizzato",
};

export const MAINTENANCE_PRESET_STATUS_LABELS: Record<MaintenancePresetStatus, string> = {
  active: "Attivo",
  draft: "Bozza",
  archived: "Archiviato",
};

export const MAINTENANCE_EXECUTION_TYPE_LABELS: Record<MaintenanceExecutionType, string> = {
  scheduled: "Pianificato",
  corrective: "Correttivo",
  manual: "Manuale",
  emergency: "Emergenza",
};

export const MAINTENANCE_INTERVAL_TYPE_LABELS: Record<MaintenanceIntervalType, string> = {
  ore: "ore",
  km: "km",
  giorni: "giorni",
  mesi: "mesi",
};

export const REPLACEMENT_CONDITION_LABELS: Record<ReplacementCondition, string> = {
  sempre: "Sempre",
  solo_se_usurato: "Solo se usurato",
  solo_se_contaminato: "Solo se contaminato",
  ogni_n_tagliandi: "Ogni N tagliandi",
  ogni_n_ore: "Ogni N ore",
  ogni_n_km: "Ogni N km",
};
