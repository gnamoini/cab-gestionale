import type { ExecutiveMetricDefinition } from "@/lib/report/executive/types";

export const EXECUTIVE_METRIC_REGISTRY: readonly ExecutiveMetricDefinition[] = [
  {
    metricId: "lav-chiusi",
    dataset: "lavorazioni",
    displayKey: "report.executive.closed",
    priority: 1,
    drillDown: { metricId: "lav-chiusi", targetSection: "lavorazioni" },
  },
  {
    metricId: "lav-aperti",
    dataset: "lavorazioni",
    displayKey: "report.executive.open",
    priority: 2,
    drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
  },
  {
    metricId: "lav_late_sla",
    dataset: "lavorazioni",
    displayKey: "report.executive.sla",
    priority: 3,
    drillDown: { metricId: "lav_late_sla", targetSection: "lavorazioni", targetTab: "sla" },
  },
  {
    metricId: "eco_fatturato",
    dataset: "economico",
    displayKey: "report.executive.revenue",
    priority: 4,
    drillDown: { metricId: "eco_fatturato", targetSection: "dati_economici", targetTab: "fatture" },
  },
  {
    metricId: "eco_da_incassare",
    dataset: "economico",
    displayKey: "report.executive.receivables",
    priority: 5,
    drillDown: { metricId: "eco_da_incassare", targetSection: "dati_economici", targetTab: "crediti" },
  },
  {
    metricId: "scorta",
    dataset: "magazzino",
    displayKey: "report.executive.stock",
    priority: 6,
    drillDown: { metricId: "scorta", targetSection: "magazzino_ricambi", targetTab: "scorta" },
  },
] as const;

export function sortedExecutiveMetrics(): ExecutiveMetricDefinition[] {
  return [...EXECUTIVE_METRIC_REGISTRY].sort((a, b) => a.priority - b.priority);
}
