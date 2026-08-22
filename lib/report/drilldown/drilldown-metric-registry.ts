import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import type {
  ReportDrillDownAggregationKind,
  ReportDrillDownKind,
  ReportDrillDownRecordEntity,
} from "@/lib/report/drilldown/types";

export type DrilldownMetricRegistryEntry = {
  metricId: string;
  resolverId: string;
  aggregationKind: ReportDrillDownAggregationKind;
  drillDownKind: ReportDrillDownKind;
  parityApplicable: boolean;
  requiredModule: GestionalePageKey;
  recordEntity: ReportDrillDownRecordEntity;
  supportedFilters: readonly string[];
  supportedDimensions: readonly string[];
};

const LAV = {
  resolverId: "lavorazioni",
  aggregationKind: "count" as const,
  drillDownKind: "record_list" as const,
  requiredModule: "lavorazioni" as const,
  recordEntity: "lavorazione" as const,
  supportedFilters: [] as const,
  supportedDimensions: [] as const,
};

export const DRILLDOWN_METRIC_REGISTRY: Record<string, DrilldownMetricRegistryEntry> = {
  "lav-periodo": {
    metricId: "lav-periodo",
    ...LAV,
    parityApplicable: true,
  },
  "lav-chiusi": {
    metricId: "lav-chiusi",
    ...LAV,
    parityApplicable: true,
  },
  "lav-aperti": {
    metricId: "lav-aperti",
    ...LAV,
    aggregationKind: "snapshot",
    parityApplicable: true,
  },
  lav_late_sla: {
    metricId: "lav_late_sla",
    ...LAV,
    parityApplicable: true,
  },
  lav_cancelled: {
    metricId: "lav_cancelled",
    ...LAV,
    parityApplicable: true,
  },
  eco_fatturato: {
    metricId: "eco_fatturato",
    resolverId: "economico",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "fatturazione",
    recordEntity: "fattura",
    supportedFilters: ["stato"],
    supportedDimensions: ["cliente"],
  },
  eco_incassato: {
    metricId: "eco_incassato",
    resolverId: "economico",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "fatturazione",
    recordEntity: "fattura",
    supportedFilters: [],
    supportedDimensions: ["cliente"],
  },
  eco_da_incassare: {
    metricId: "eco_da_incassare",
    resolverId: "economico",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "fatturazione",
    recordEntity: "fattura",
    supportedFilters: [],
    supportedDimensions: ["cliente"],
  },
  eco_importo_scaduto: {
    metricId: "eco_importo_scaduto",
    resolverId: "economico",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: true,
    requiredModule: "fatturazione",
    recordEntity: "fattura",
    supportedFilters: [],
    supportedDimensions: ["cliente"],
  },
  eco_margine_operativo_stimato: {
    metricId: "eco_margine_operativo_stimato",
    resolverId: "composition",
    aggregationKind: "composite",
    drillDownKind: "composition_analysis",
    parityApplicable: false,
    requiredModule: "fatturazione",
    recordEntity: "fattura",
    supportedFilters: [],
    supportedDimensions: [],
  },
  eco_preventivi: {
    metricId: "eco_preventivi",
    resolverId: "preventivi",
    aggregationKind: "count",
    drillDownKind: "record_list",
    parityApplicable: true,
    requiredModule: "fatturazione",
    recordEntity: "preventivo",
    supportedFilters: ["statoWorkflow"],
    supportedDimensions: [],
  },
  eco_preventivi_approvati: {
    metricId: "eco_preventivi_approvati",
    resolverId: "preventivi",
    aggregationKind: "count",
    drillDownKind: "record_list",
    parityApplicable: true,
    requiredModule: "fatturazione",
    recordEntity: "preventivo",
    supportedFilters: ["statoWorkflow"],
    supportedDimensions: [],
  },
  eco_ddt: {
    metricId: "eco_ddt",
    resolverId: "ddt",
    aggregationKind: "count",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "fatturazione",
    recordEntity: "ddt",
    supportedFilters: ["status"],
    supportedDimensions: [],
  },
  scorta: {
    metricId: "scorta",
    resolverId: "magazzino",
    aggregationKind: "count",
    drillDownKind: "record_list",
    parityApplicable: true,
    requiredModule: "magazzino",
    recordEntity: "ricambio",
    supportedFilters: [],
    supportedDimensions: [],
  },
  cap: {
    metricId: "cap",
    resolverId: "magazzino",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "magazzino",
    recordEntity: "ricambio",
    supportedFilters: [],
    supportedDimensions: [],
  },
  "ric-usati": {
    metricId: "ric-usati",
    resolverId: "magazzino",
    aggregationKind: "sum",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "magazzino",
    recordEntity: "movimento",
    supportedFilters: ["ricambioId"],
    supportedDimensions: [],
  },
  mag_orders: {
    metricId: "mag_orders",
    resolverId: "ordini",
    aggregationKind: "count",
    drillDownKind: "record_list",
    parityApplicable: false,
    requiredModule: "magazzino",
    recordEntity: "ordine_fornitore",
    supportedFilters: ["status"],
    supportedDimensions: [],
  },
};

export function getDrilldownMetricEntry(metricId: string): DrilldownMetricRegistryEntry | null {
  return DRILLDOWN_METRIC_REGISTRY[metricId] ?? null;
}

export function isDrilldownSupported(metricId: string): boolean {
  return Boolean(getDrilldownMetricEntry(metricId));
}

export function listSupportedDrilldownMetricIds(): string[] {
  return Object.keys(DRILLDOWN_METRIC_REGISTRY);
}
