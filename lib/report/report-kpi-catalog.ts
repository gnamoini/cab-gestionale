import type { DerivedKey } from "@/lib/report/report-domain-types";

export type ReportSectionId =
  | "analisi_ai"
  | "lavorazioni"
  | "magazzino_ricambi"
  | "ore_lavorate"
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

export const REPORT_KPI_CATALOG: readonly ReportKpiCatalogEntry[] = [
  { id: "lav_open", section: "lavorazioni", label: "Aperte", owner: "operational", source: "kpi-performance-formulas" },
  { id: "lav_completed", section: "lavorazioni", label: "Completate", owner: "operational", source: "lavorazioni-report-selectors" },
  { id: "lav_archived", section: "lavorazioni", label: "Archiviate", owner: "operational", source: "lavorazioni-report-adapter" },
  { id: "lav_cancelled", section: "lavorazioni", label: "Annullate", owner: "operational", source: "lavorazioni-report-selectors" },
  { id: "lav_backlog", section: "lavorazioni", label: "Backlog", owner: "operational", source: "kpi-performance-formulas" },
  { id: "lav_avg_close", section: "lavorazioni", label: "Tempo medio chiusura", owner: "operational", source: "lavorazioni-report-selectors" },
  { id: "lav_late_sla", section: "lavorazioni", label: "Oltre SLA", owner: "operational", source: "kpi-performance-formulas" },
  { id: "lav_clients", section: "lavorazioni", label: "Clienti serviti", owner: "operational", source: "lavorazioni-report-selectors" },
  { id: "mag_parts_qty", section: "magazzino_ricambi", label: "Ricambi utilizzati", owner: "warehouse", source: "magazzino-period-aggregate" },
  { id: "mag_movement_value", section: "magazzino_ricambi", label: "Valore movimentato", owner: "warehouse", source: "kpi-performance-formulas" },
  { id: "mag_critical", section: "magazzino_ricambi", label: "Sotto scorta", owner: "warehouse", source: "kpi-performance-formulas" },
  { id: "mag_orders", section: "magazzino_ricambi", label: "Ordini fornitori", owner: "warehouse", source: "ordini-fornitori" },
  { id: "ore_total", section: "ore_lavorate", label: "Ore totali", owner: "labor", source: "timesheet-totals" },
  { id: "ore_per_job", section: "ore_lavorate", label: "Media ore/intervento", owner: "labor", source: "report-domain-analytics" },
  { id: "eco_preventivi", section: "dati_economici", label: "Preventivi", owner: "economic", source: "preventivi-records" },
  { id: "eco_invoices", section: "dati_economici", label: "Fatturato", owner: "economic", source: "invoice-calculations" },
  { id: "eco_ddt", section: "dati_economici", label: "DDT", owner: "economic", source: "ddt-calculations" },
  { id: "cross_efficiency", section: "analisi_incrociate", label: "Efficienza", owner: "cross", source: "report-domain-analytics" },
  { id: "cross_cost_job", section: "analisi_incrociate", label: "Costo medio lavorazione", owner: "cross", source: "report-domain-analytics" },
  { id: "cross_value_hour", section: "analisi_incrociate", label: "Valore/ora", owner: "cross", source: "report-domain-analytics" },
  { id: "cross_parts_job", section: "analisi_incrociate", label: "Ricambi/intervento", owner: "cross", source: "report-domain-analytics" },
] as const;

export function reportKpiIdsForSection(section: ReportSectionId | "strip"): string[] {
  return REPORT_KPI_CATALOG.filter((e) => e.section === section).map((e) => e.id);
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
