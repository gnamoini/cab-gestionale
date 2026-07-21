/**
 * SSOT enums — Maintenance Planning Engine v2
 */

export const MAINTENANCE_INTERVAL_TYPES = ["ore", "km", "giorni"] as const;
export type MaintenanceIntervalType = (typeof MAINTENANCE_INTERVAL_TYPES)[number];

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

export const REPLACEMENT_CONDITION_LABELS: Record<ReplacementCondition, string> = {
  sempre: "Sempre",
  solo_se_usurato: "Solo se usurato",
  solo_se_contaminato: "Solo se contaminato",
  ogni_n_tagliandi: "Ogni N tagliandi",
  ogni_n_ore: "Ogni N ore",
  ogni_n_km: "Ogni N km",
};
