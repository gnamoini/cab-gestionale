/**
 * @deprecated Usare REPORT_METRIC_REGISTRY da lib/report/metrics/report-metric-registry
 */
import type { DerivedKey } from "@/lib/report/report-domain-types";
import {
  REPORT_METRIC_REGISTRY,
  reportMetricIdsForSection,
} from "@/lib/report/metrics/report-metric-registry";

export {
  REPORT_METRIC_REGISTRY,
  getRegistryEntry,
  assertRegistryUnique,
  reportMetricIdsForSection,
  activeUiMetricIds,
} from "@/lib/report/metrics/report-metric-registry";

export { getMetricDefinition, tryGetMetricDefinition } from "@/lib/report/metrics/get-metric-definition";

export type { ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export type ReportSectionId =
  | "analisi_ai"
  | "lavorazioni"
  | "clienti_mezzi"
  | "magazzino_ricambi"
  | "ore_lavorate"
  | "analisi_ore_officina"
  | "recidivita_mezzi"
  | "dati_economici"
  | "analisi_incrociate";

export type ReportKpiOwner = DerivedKey | "cross" | "perf";

export type ReportKpiCatalogEntry = {
  id: string;
  section: ReportSectionId | "strip";
  label: string;
  owner: ReportKpiOwner;
  source: string;
};

const LEGACY_DOMAIN_IDS = new Set([
  "lav_open",
  "lav_completed",
  "lav_archived",
  "lav_cancelled",
  "lav_backlog",
  "lav_avg_close",
  "lav_late_sla",
  "lav_clients",
  "mag_parts_qty",
  "mag_movement_value",
  "mag_critical",
  "mag_orders",
  "ore_total",
  "ore_per_job",
  "eco_preventivi",
  "eco_invoices",
  "eco_ddt",
  "cross_efficiency",
  "cross_cost_job",
  "cross_value_hour",
  "cross_parts_job",
]);

function categoryToLegacyOwner(id: string, category: string): ReportKpiOwner {
  if (id.startsWith("cross_")) return "cross";
  if (category === "economic") return "economic";
  if (category === "warehouse") return "warehouse";
  if (category === "fleet") return "perf";
  if (category === "operational" || category === "customer") return "operational";
  return "operational";
}

/** Legacy catalog derivato dal registry (domain + cross). */
export const REPORT_KPI_CATALOG: readonly ReportKpiCatalogEntry[] = REPORT_METRIC_REGISTRY.filter((e) =>
  LEGACY_DOMAIN_IDS.has(e.id),
).map((e) => ({
  id: e.id,
  section: e.owner === "analisi_incrociate" ? "analisi_incrociate" : e.owner,
  label: e.label,
  owner: categoryToLegacyOwner(e.id, e.category),
  source: e.sourceModule,
}));

export function reportKpiIdsForSection(section: ReportSectionId | "strip"): string[] {
  if (section === "strip") return [];
  return reportMetricIdsForSection(section);
}

export function assertReportKpiCatalogUnique(): void {
  const ids = new Set<string>();
  for (const e of REPORT_KPI_CATALOG) {
    if (ids.has(e.id)) throw new Error(`Duplicate KPI catalog id: ${e.id}`);
    ids.add(e.id);
  }
}

export function assertStripSectionKpiDisjoint(): void {
  const strip = new Set(reportKpiIdsForSection("strip"));
  for (const section of [
    "lavorazioni",
    "magazzino_ricambi",
    "ore_lavorate",
    "dati_economici",
    "analisi_incrociate",
  ] as const) {
    for (const id of reportKpiIdsForSection(section)) {
      if (strip.has(id)) throw new Error(`KPI ${id} in strip and ${section}`);
    }
  }
}
