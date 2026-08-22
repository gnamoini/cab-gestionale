import type { ReportSectionId } from "@/components/report/report-sections-config";

export type LegacyChartStatus =
  | "NOT_AUDITED"
  | "MIGRATE"
  | "MIGRATED"
  | "BLOCKED"
  | "REMOVE"
  | "DEFER"
  | "KEEP_LEGACY";

export type LegacyBlockedMeta = {
  blockedReason: string;
  requiredCapability: string;
  reviewTarget: string;
};

export type LegacyChartEntry = {
  id: string;
  domain: ReportSectionId | "analisi_ore_officina";
  label: string;
  legacyComponent: string;
  ssotBuilder: string;
  engineMetricIds?: readonly string[];
  biReplacement?: string;
  status: LegacyChartStatus;
  notes?: string;
  blocked?: LegacyBlockedMeta;
  deferReason?: string;
  futureTarget?: string;
};

/** SSOT: per-chart legacy migration — consumed by removal regression + inventory §12. */
export const LEGACY_CHART_MIGRATION_MATRIX: readonly LegacyChartEntry[] = [
  // —— Lavorazioni ——
  {
    id: "lav-ingressi-chiusure",
    domain: "lavorazioni",
    label: "Ingressi vs chiusure (mensile)",
    legacyComponent: "ReportIngressiChiusureChart",
    ssotBuilder: "buildIngressiChiusureMonthlyPoints",
    engineMetricIds: ["lav-periodo", "lav-chiusi"],
    biReplacement: "ReportLavorazioniChartsPanel",
    status: "MIGRATED",
  },
  {
    id: "lav-kpi-grid",
    domain: "lavorazioni",
    label: "KPI lavorazioni",
    legacyComponent: "ReportExecutiveKpiSection",
    ssotBuilder: "unified KPI / engine",
    biReplacement: "ReportLavorazioniBiSection",
    status: "MIGRATED",
  },
  {
    id: "lav-duplicate-trend",
    domain: "lavorazioni",
    label: "Trend periodo duplicato",
    legacyComponent: "report-lav-trend",
    ssotBuilder: "buildIngressiChiusureMonthlyPoints",
    status: "REMOVE",
    notes: "Redundant duplicate section.",
  },
  {
    id: "lav-backlog-proxy-bar",
    domain: "lavorazioni",
    label: "Trend accumulo (proxy)",
    legacyComponent: "ReportBarChart",
    ssotBuilder: "buildBacklogTrendProxy",
    status: "REMOVE",
    notes: "Redundant with saldo cumulativo in ingressi/chiusure.",
  },
  {
    id: "lav-aging-backlog",
    domain: "lavorazioni",
    label: "Aging backlog stacked",
    legacyComponent: "ReportAgingBacklogStackedChart",
    ssotBuilder: "buildAgingBacklogStackedByStato",
    engineMetricIds: ["lav_aging_backlog"],
    status: "MIGRATED",
    blocked: {
      blockedReason: "missing stato dimension in engine",
      requiredCapability: "stato_lavorazione breakdown series",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-stato-aging-matrix",
    domain: "lavorazioni",
    label: "Matrice stato × aging",
    legacyComponent: "ReportDataTable lav-stato-aging",
    ssotBuilder: "buildStatoAgingMatrix",
    status: "MIGRATED",
    blocked: {
      blockedReason: "missing stato dimension in engine",
      requiredCapability: "stato_lavorazione breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-wip-funnel",
    domain: "lavorazioni",
    label: "WIP funnel per stato",
    legacyComponent: "ReportLavorazioniFunnelChart",
    ssotBuilder: "buildWipFunnelByStato",
    engineMetricIds: ["lav-aperti"],
    status: "MIGRATED",
    blocked: {
      blockedReason: "needs dimensional breakdown on lav-aperti",
      requiredCapability: "stato workflow funnel series",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-close-time-priorita",
    domain: "lavorazioni",
    label: "Tempi chiusura per priorità",
    legacyComponent: "ReportCloseTimePrioritaChart",
    ssotBuilder: "buildCloseTimeByPriorita",
    status: "MIGRATED",
    blocked: {
      blockedReason: "needs priority dimension",
      requiredCapability: "priorita breakdown on close-time",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-sla-table",
    domain: "lavorazioni",
    label: "Interventi oltre SLA",
    legacyComponent: "ReportDataTable lav-sla",
    ssotBuilder: "listInterventiOltreSla",
    status: "MIGRATED",
    blocked: {
      blockedReason: "engine has count only",
      requiredCapability: "P3 row drill-down for SLA rows",
      reviewTarget: "P3 drill-down",
    },
  },
  {
    id: "lav-recidiva",
    domain: "lavorazioni",
    label: "Recidiva mezzi",
    legacyComponent: "ReportDataTable lav-recidiva",
    ssotBuilder: "listRecidivaMezzi",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no engine metric",
      requiredCapability: "recidiva entity breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-mtbf",
    domain: "lavorazioni",
    label: "MTBF/MTTR per mezzo",
    legacyComponent: "ReportDataTable lav-mtbf",
    ssotBuilder: "buildMtbfMttrByMezzo",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no engine metric",
      requiredCapability: "fleet reliability breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "lav-year-matrix",
    domain: "lavorazioni",
    label: "Matrice annuale + forecast",
    legacyComponent: "lavorazioni-year-matrix",
    ssotBuilder: "lavorazioni-year-matrix.ts",
    status: "MIGRATED",
    deferReason: "Manual Excel overrides and seasonal matrix",
    futureTarget: "KEEP_LEGACY operational embed",
  },
  {
    id: "lav-excel-import",
    domain: "lavorazioni",
    label: "Import dati storici Excel",
    legacyComponent: "ReportLavorazioniSection embed",
    ssotBuilder: "—",
    status: "REMOVE",
    deferReason: "Data ingestion, not analytics",
    futureTarget: "operational module",
  },
  // —— Magazzino ——
  {
    id: "mag-kpi-grid",
    domain: "magazzino_ricambi",
    label: "KPI magazzino",
    legacyComponent: "ReportExecutiveKpiSection",
    ssotBuilder: "buildWarehouseAnalytics",
    biReplacement: "ReportMagazzinoBiSection",
    status: "MIGRATED",
  },
  {
    id: "mag-entrate-uscite",
    domain: "magazzino_ricambi",
    label: "Entrate/uscite stacked",
    legacyComponent: "magazzino movement chart",
    ssotBuilder: "getMagazzinoMonthlyRowsForRange",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no engine monthly movement series",
      requiredCapability: "mag movement monthly series",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "mag-capitale-line",
    domain: "magazzino_ricambi",
    label: "Capitale immobilizzato trend",
    legacyComponent: "capitale line chart",
    ssotBuilder: "derived cache",
    engineMetricIds: ["cap"],
    status: "MIGRATED",
    blocked: {
      blockedReason: "cap is snapshot KPI only",
      requiredCapability: "capitale time series",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "mag-category-donut",
    domain: "magazzino_ricambi",
    label: "Donut valore per categoria",
    legacyComponent: "category donut",
    ssotBuilder: "buildStockValueByCategory",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no category dimension in engine",
      requiredCapability: "categoria stock breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "mag-pareto-consumi",
    domain: "magazzino_ricambi",
    label: "Pareto consumi",
    legacyComponent: "pareto chart",
    ssotBuilder: "buildParetoConsumi",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no ricambio dimension in engine",
      requiredCapability: "ricambio pareto breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "mag-risk-tables",
    domain: "magazzino_ricambi",
    label: "Risk matrix / sotto scorta",
    legacyComponent: "mag risk tables",
    ssotBuilder: "magazzino-analytics.ts",
    status: "MIGRATED",
    blocked: {
      blockedReason: "detail tables without engine contract",
      requiredCapability: "stock risk row drill-down",
      reviewTarget: "P3 drill-down",
    },
  },
  {
    id: "mag-ordini-table",
    domain: "magazzino_ricambi",
    label: "Ordini fornitori aperti",
    legacyComponent: "ReportDataTable ordini-fornitori",
    ssotBuilder: "buildOrdiniFornitoriReportRows",
    engineMetricIds: ["mag_orders"],
    biReplacement: "ReportMagazzinoChartsPanel",
    status: "MIGRATED",
  },
  {
    id: "mag-ricambi-ranking",
    domain: "magazzino_ricambi",
    label: "Ranking ricambi",
    legacyComponent: "ricambi ranking",
    ssotBuilder: "ricambio-consumo-from-log.ts",
    status: "MIGRATED",
    deferReason: "Operational ranking; magazzino page is SSOT",
    futureTarget: "link to magazzino module",
  },
  {
    id: "mag-monthly-matrix",
    domain: "magazzino_ricambi",
    label: "Matrice mensile + edit manuale",
    legacyComponent: "report-magazzino-section matrix",
    ssotBuilder: "magazzino-manual-storage",
    status: "REMOVE",
    deferReason: "Manual month storage and overrides",
    futureTarget: "operational module",
  },
  // —— Clienti/Mezzi ——
  {
    id: "cm-kpi-pareto",
    domain: "clienti_mezzi",
    label: "KPI + pareto fatturato",
    legacyComponent: "ReportClientiSection",
    ssotBuilder: "buildTopClientiFatturatoEnriched",
    biReplacement: "ReportClientiSection",
    status: "MIGRATED",
  },
  {
    id: "cm-fleet",
    domain: "clienti_mezzi",
    label: "Fleet disponibilità/guasti",
    legacyComponent: "fleet charts",
    ssotBuilder: "build-kpi-performance-model",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no engine fleet dimensions",
      requiredCapability: "fleet availability breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "cm-pareto-interventi",
    domain: "clienti_mezzi",
    label: "Pareto per interventi",
    legacyComponent: "buildParetoClientiPoints",
    ssotBuilder: "buildParetoClientiPoints",
    status: "REMOVE",
    notes: "Different semantics vs fatturato pareto; low decision value.",
  },
  {
    id: "cm-mtbf-recidiva",
    domain: "clienti_mezzi",
    label: "MTBF/recidiva/classifiche",
    legacyComponent: "shared lavorazioni tables",
    ssotBuilder: "lavorazioni-work-orders.ts",
    status: "MIGRATED",
    blocked: {
      blockedReason: "shared with lavorazioni blocked items",
      requiredCapability: "entity reliability breakdown",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "cm-compliance",
    domain: "clienti_mezzi",
    label: "Compliance / lifecycle",
    legacyComponent: "asset-lifecycle",
    ssotBuilder: "asset-lifecycle",
    status: "MIGRATED",
    deferReason: "Feature-flagged; Mezzi page is SSOT",
    futureTarget: "mezzi module",
  },
  // —— Risorse ——
  {
    id: "res-core-kpi",
    domain: "ore_lavorate",
    label: "KPI core + presence trend",
    legacyComponent: "ReportRisorseSection",
    ssotBuilder: "engine",
    biReplacement: "ReportRisorseSection",
    status: "MIGRATED",
  },
  {
    id: "res-single-trend",
    domain: "ore_lavorate",
    label: "Single-point trend widget",
    legacyComponent: "legacy trend widget",
    ssotBuilder: "weak inline",
    status: "REMOVE",
    notes: "Superseded by BI ReportTrendChart.",
  },
  {
    id: "res-ore-dipendente",
    domain: "ore_lavorate",
    label: "Ore per dipendente",
    legacyComponent: "aggregateOrePerDipendente",
    ssotBuilder: "aggregateOrePerDipendente",
    status: "MIGRATED",
    blocked: {
      blockedReason: "no dipendente dimension in engine",
      requiredCapability: "dipendente breakdown series",
      reviewTarget: "future engine extension",
    },
  },
  {
    id: "res-timesheet-embed",
    domain: "ore_lavorate",
    label: "Timesheet embed",
    legacyComponent: "ReportTeamTimesheetZone",
    ssotBuilder: "—",
    status: "REMOVE",
    deferReason: "Operational module embed",
    futureTarget: "timesheet module",
  },
  // —— Analisi ore officina ——
  {
    id: "analisi-ore-officina-section",
    domain: "analisi_ore_officina",
    label: "Analisi ore officina (intera sezione)",
    legacyComponent: "report-analisi-ore-officina-section",
    ssotBuilder: "specialized operational",
    status: "MIGRATED",
    deferReason: "specialized operational analysis",
    futureTarget: "dedicated BI extension",
  },
  // —— Cross ——
  {
    id: "cross-kpi-four",
    domain: "analisi_incrociate",
    label: "4 KPI incrociati",
    legacyComponent: "CrossKpiGrid",
    ssotBuilder: "build-report-cross-dto",
    biReplacement: "ReportCrossMetricsSection",
    status: "MIGRATED",
  },
  {
    id: "cross-pairwise",
    domain: "analisi_incrociate",
    label: "Trend pairwise domini",
    legacyComponent: "ReportCrossDomainSection",
    ssotBuilder: "engine pairs",
    biReplacement: "ReportCrossDomainSection",
    status: "MIGRATED",
  },
  {
    id: "cross-indexed-trend",
    domain: "analisi_incrociate",
    label: "Trend cross-domain indicizzato",
    legacyComponent: "ReportMultiSeriesLineChart indexed",
    ssotBuilder: "buildCrossMonthlyTrend",
    engineMetricIds: ["cross_efficiency", "cross_parts_job", "cross_cost_job", "cross_value_hour"],
    biReplacement: "ReportCrossTrendSection",
    status: "MIGRATED",
    notes: "Builder SSOT; engine supportsSeries false until per-metric audit passes.",
  },
  {
    id: "cross-catena-valore",
    domain: "analisi_incrociate",
    label: "Catena del valore",
    legacyComponent: "ReportBarChart catena",
    ssotBuilder: "buildCrossCatenaValore",
    engineMetricIds: ["eco_preventivi", "lav-chiusi", "eco_fatturato", "eco_incassato"],
    biReplacement: "ReportCrossCatenaSection",
    status: "MIGRATED",
  },
  {
    id: "cross-cost-composition",
    domain: "analisi_incrociate",
    label: "Composizione costo lavorazione",
    legacyComponent: "ReportBarChart waterfall",
    ssotBuilder: "inline derived",
    status: "MIGRATED",
    blocked: {
      blockedReason: "same policy as margin waterfall",
      requiredCapability: "certified margin decomposition",
      reviewTarget: "economia engine extension",
    },
  },
  {
    id: "cross-scatter",
    domain: "analisi_incrociate",
    label: "Scatter correlazioni",
    legacyComponent: "CrossScatterChart",
    ssotBuilder: "buildCrossScatterPoints",
    status: "MIGRATED",
    blocked: {
      blockedReason: "entity-level; no engine contract",
      requiredCapability: "entity scatter DTO",
      reviewTarget: "dedicated BI extension",
    },
  },
  {
    id: "cross-cliente-matrix",
    domain: "analisi_incrociate",
    label: "Cliente × redditività",
    legacyComponent: "cross-cliente-redditivita table",
    ssotBuilder: "buildCrossClienteRedditivita",
    status: "MIGRATED",
    blocked: {
      blockedReason: "needs breakdown DTO",
      requiredCapability: "cliente profitability matrix",
      reviewTarget: "dedicated BI extension",
    },
  },
  {
    id: "cross-mezzo-matrix",
    domain: "analisi_incrociate",
    label: "Mezzo × costo",
    legacyComponent: "cross-mezzo-costo table",
    ssotBuilder: "perf path",
    status: "MIGRATED",
    blocked: {
      blockedReason: "SSOT drift vs builder",
      requiredCapability: "mezzo cost breakdown DTO",
      reviewTarget: "dedicated BI extension",
    },
  },
  {
    id: "cross-volume-anomaly",
    domain: "analisi_incrociate",
    label: "Anomalie volume",
    legacyComponent: "buildCrossVolumeAnomaly",
    ssotBuilder: "buildCrossVolumeAnomaly",
    status: "MIGRATED",
    deferReason: "Optional overlay on lav-chiusi series",
    futureTarget: "trend overlay extension",
  },
  {
    id: "cross-auto-insights",
    domain: "analisi_incrociate",
    label: "Insight automatici",
    legacyComponent: "crossInsights inline",
    ssotBuilder: "inline",
    status: "REMOVE",
    notes: "BI policy: no interpretive UI in legacy.",
  },
] as const;

export function listChartsByDomain(
  domain: LegacyChartEntry["domain"],
): readonly LegacyChartEntry[] {
  return LEGACY_CHART_MIGRATION_MATRIX.filter((e) => e.domain === domain);
}

export function listBlockedCharts(): readonly LegacyChartEntry[] {
  return LEGACY_CHART_MIGRATION_MATRIX.filter((e) => e.status === "BLOCKED");
}

export function listMigratedChartIds(): string[] {
  return LEGACY_CHART_MIGRATION_MATRIX.filter((e) => e.status === "MIGRATED").map((e) => e.id);
}
