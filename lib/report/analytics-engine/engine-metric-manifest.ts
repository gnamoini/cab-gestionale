import type { ExecutiveDatasetKey } from "@/lib/report/executive/types";

/** Source slices beyond base BFF integrity — union driven by requested metricIds. */
export type AnalyticsSourceSliceFlags = {
  preventivi: boolean;
  invoices: boolean;
  invoicePayments: boolean;
  ddt: boolean;
  timesheet: boolean;
  schede: boolean;
  ordini: boolean;
};

export type EngineMetricManifestEntry = {
  metricId: string;
  calculatorId: string;
  requiredSlices: Partial<AnalyticsSourceSliceFlags>;
  executiveDataset?: ExecutiveDatasetKey;
  supportsCompare: boolean;
  supportsSeries: boolean;
};

/** SSOT: metric → calculator + minimal loader requirements. */
export const ENGINE_METRIC_MANIFEST: Record<string, EngineMetricManifestEntry> = {
  "lav-periodo": {
    metricId: "lav-periodo",
    calculatorId: "computeLavPeriodo",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: true,
  },
  "lav-chiusi": {
    metricId: "lav-chiusi",
    calculatorId: "computeLavChiusi",
    requiredSlices: {},
    executiveDataset: "lavorazioni",
    supportsCompare: true,
    supportsSeries: true,
  },
  "lav-aperti": {
    metricId: "lav-aperti",
    calculatorId: "computeLavAperti",
    requiredSlices: {},
    executiveDataset: "lavorazioni",
    supportsCompare: false,
    supportsSeries: true,
  },
  "lav-tempo": {
    metricId: "lav-tempo",
    calculatorId: "computeLavTempoMedio",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: false,
  },
  lav_late_sla: {
    metricId: "lav_late_sla",
    calculatorId: "computeLavLateSla",
    requiredSlices: {},
    executiveDataset: "lavorazioni",
    supportsCompare: false,
    supportsSeries: false,
  },
  eco_fatturato: {
    metricId: "eco_fatturato",
    calculatorId: "computeEcoFatturato",
    requiredSlices: { invoices: true, invoicePayments: true },
    executiveDataset: "economico",
    supportsCompare: true,
    supportsSeries: true,
  },
  eco_incassato: {
    metricId: "eco_incassato",
    calculatorId: "computeEcoIncassato",
    requiredSlices: { invoices: true, invoicePayments: true },
    supportsCompare: true,
    supportsSeries: true,
  },
  eco_da_incassare: {
    metricId: "eco_da_incassare",
    calculatorId: "computeEcoDaIncassare",
    requiredSlices: { invoices: true, invoicePayments: true },
    executiveDataset: "economico",
    supportsCompare: false,
    supportsSeries: false,
  },
  eco_importo_scaduto: {
    metricId: "eco_importo_scaduto",
    calculatorId: "computeEcoImportoScaduto",
    requiredSlices: { invoices: true, invoicePayments: true },
    supportsCompare: false,
    supportsSeries: false,
  },
  eco_margine_operativo_stimato: {
    metricId: "eco_margine_operativo_stimato",
    calculatorId: "computeEcoMargineOperativoStimato",
    requiredSlices: { invoices: true, invoicePayments: true, schede: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  eco_preventivi: {
    metricId: "eco_preventivi",
    calculatorId: "computeEcoPreventiviCount",
    requiredSlices: { preventivi: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  eco_preventivi_valore: {
    metricId: "eco_preventivi_valore",
    calculatorId: "computeEcoPreventiviValore",
    requiredSlices: { preventivi: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  win_rate_preventivi: {
    metricId: "win_rate_preventivi",
    calculatorId: "computeWinRatePreventivi",
    requiredSlices: { preventivi: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  scorta: {
    metricId: "scorta",
    calculatorId: "computeScorta",
    requiredSlices: {},
    executiveDataset: "magazzino",
    supportsCompare: false,
    supportsSeries: false,
  },
  "ric-usati": {
    metricId: "ric-usati",
    calculatorId: "computeRicUsati",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: true,
  },
  cap: {
    metricId: "cap",
    calculatorId: "computeCap",
    requiredSlices: {},
    supportsCompare: false,
    supportsSeries: false,
  },
  presence_hours_total: {
    metricId: "presence_hours_total",
    calculatorId: "computePresenceHoursTotal",
    requiredSlices: { timesheet: true },
    supportsCompare: true,
    supportsSeries: true,
  },
  actual_labor_hours_total: {
    metricId: "actual_labor_hours_total",
    calculatorId: "computeActualLaborHours",
    requiredSlices: { schede: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  lav_cancelled: {
    metricId: "lav_cancelled",
    calculatorId: "computeLavCancelled",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: false,
  },
  clienti: {
    metricId: "clienti",
    calculatorId: "computeClienti",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: false,
  },
  eco_ddt: {
    metricId: "eco_ddt",
    calculatorId: "computeEcoDdt",
    requiredSlices: { ddt: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  eco_preventivi_approvati: {
    metricId: "eco_preventivi_approvati",
    calculatorId: "computeEcoPreventiviApprovati",
    requiredSlices: { preventivi: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  mag_movement_value: {
    metricId: "mag_movement_value",
    calculatorId: "computeMagMovementValue",
    requiredSlices: {},
    supportsCompare: true,
    supportsSeries: false,
  },
  "cost-tot": {
    metricId: "cost-tot",
    calculatorId: "computeCostTot",
    requiredSlices: { schede: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  mag_orders: {
    metricId: "mag_orders",
    calculatorId: "computeMagOrders",
    requiredSlices: { ordini: true },
    supportsCompare: true,
    supportsSeries: false,
  },
  ore_straordinari: {
    metricId: "ore_straordinari",
    calculatorId: "computeOreStraordinari",
    requiredSlices: { timesheet: true },
    supportsCompare: false,
    supportsSeries: false,
  },
  saturazione_team: {
    metricId: "saturazione_team",
    calculatorId: "computeSaturazioneTeam",
    requiredSlices: { timesheet: true },
    supportsCompare: false,
    supportsSeries: false,
  },
  "flotta-officina": {
    metricId: "flotta-officina",
    calculatorId: "computeFlottaOfficina",
    requiredSlices: {},
    supportsCompare: false,
    supportsSeries: false,
  },
  cross_efficiency: {
    metricId: "cross_efficiency",
    calculatorId: "computeCrossEfficiencyMetric",
    requiredSlices: { schede: true, timesheet: true },
    supportsCompare: false,
    supportsSeries: false,
  },
  cross_parts_job: {
    metricId: "cross_parts_job",
    calculatorId: "computeCrossPartsJobMetric",
    requiredSlices: {},
    supportsCompare: false,
    supportsSeries: false,
  },
  cross_cost_job: {
    metricId: "cross_cost_job",
    calculatorId: "computeCrossCostJobMetric",
    requiredSlices: { schede: true },
    supportsCompare: false,
    supportsSeries: false,
  },
  cross_value_hour: {
    metricId: "cross_value_hour",
    calculatorId: "computeCrossValueHourMetric",
    requiredSlices: { invoices: true, invoicePayments: true, timesheet: true },
    supportsCompare: false,
    supportsSeries: false,
  },
};

export const EXECUTIVE_ENGINE_METRIC_IDS = [
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
  "eco_fatturato",
  "eco_da_incassare",
  "scorta",
] as const;

export function getEngineManifestEntry(metricId: string): EngineMetricManifestEntry | null {
  return ENGINE_METRIC_MANIFEST[metricId] ?? null;
}

export function listEngineSupportedMetricIds(): string[] {
  return Object.keys(ENGINE_METRIC_MANIFEST);
}
