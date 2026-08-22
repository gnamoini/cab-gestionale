export type ReportDataOwnership =
  | "bi_report"
  | "operational_module"
  | "remove"
  | "future_capability";

export type OwnershipReadiness =
  | "READY"
  | "NEEDS_OWNER_SURFACE"
  | "REMOVED"
  | "FUTURE_CAPABILITY";

export type OwnershipFinalStatus =
  | "MOVED_TO_BI"
  | "MOVED_TO_MODULE"
  | "REMOVED"
  | "FUTURE_CAPABILITY";

export type OwnershipEntry = {
  id: string;
  ownership: ReportDataOwnership;
  owner: string;
  businessPurpose: string;
  destination: string;
  reason: string;
  readiness: OwnershipReadiness;
  finalStatus: OwnershipFinalStatus;
  reviewTarget?: string;
  moduleCta?: { label: string; href: string };
  rbacModules?: readonly string[];
  surfaceRef?: string;
};

/** SSOT: P9 functional ownership — every legacy residual must have destination or explicit removal. */
export const REPORT_DATA_OWNERSHIP: readonly OwnershipEntry[] = [
  // —— Lavorazioni WIP/aging (grouped ids share surface) ——
  {
    id: "lav-aging-backlog",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Aging backlog per stato — gestione WIP",
    destination: "/lavorazioni",
    reason: "Dettaglio operativo; KPI direzionale in BI (lav-aperti, lav_late_sla)",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
    moduleCta: { label: "Dettaglio backlog e SLA", href: "/lavorazioni" },
  },
  {
    id: "lav-stato-aging-matrix",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Matrice stato × aging",
    destination: "/lavorazioni",
    reason: "Breakdown operativo per stato workflow",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
  },
  {
    id: "lav-wip-funnel",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Funnel WIP per stato",
    destination: "/lavorazioni",
    reason: "Gestione stati in officina",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
  },
  {
    id: "lav-close-time-priorita",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Tempi chiusura per priorità",
    destination: "/lavorazioni",
    reason: "Analisi operativa priorità",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
  },
  {
    id: "lav-sla-table",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Interventi oltre SLA — dettaglio righe",
    destination: "/lavorazioni",
    reason: "BI espone KPI lav_late_sla; dettaglio in modulo",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
  },
  {
    id: "lav-recidiva",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "Recidiva mezzi",
    destination: "/mezzi",
    reason: "Affidabilità flotta — contesto mezzi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi", "lavorazioni"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
    moduleCta: { label: "Analisi flotta e recidività", href: "/mezzi" },
  },
  {
    id: "lav-mtbf",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "MTBF/MTTR per mezzo",
    destination: "/mezzi",
    reason: "Affidabilità flotta",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi", "lavorazioni"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
  },
  {
    id: "lav-year-matrix",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Matrice annuale stagionalità",
    destination: "—",
    reason: "Solo legacy Report; nessun uso operativo documentato in P9",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "lav-excel-import",
    ownership: "operational_module",
    owner: "lavorazioni",
    businessPurpose: "Import dati storici Excel",
    destination: "/lavorazioni",
    reason: "Processo ingestione dati, non analytics BI",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["lavorazioni"],
    surfaceRef: "components/operational-analytics/lavorazioni-operational-panel.tsx",
  },
  // —— Magazzino ——
  {
    id: "mag-entrate-uscite",
    ownership: "remove",
    owner: "report",
    businessPurpose: "Trend entrate/uscite",
    destination: "Advanced Magazzino — ric-usati",
    reason: "Direzione coperta da KPI/trend BI",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
  },
  {
    id: "mag-capitale-line",
    ownership: "remove",
    owner: "report",
    businessPurpose: "Capitale immobilizzato trend",
    destination: "Advanced Magazzino — cap KPI",
    reason: "Snapshot KPI in BI; serie non certificata",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
  },
  {
    id: "mag-category-donut",
    ownership: "operational_module",
    owner: "magazzino",
    businessPurpose: "Valore stock per categoria",
    destination: "/magazzino",
    reason: "Dettaglio stock operativo",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["magazzino"],
    surfaceRef: "components/operational-analytics/magazzino-operational-panel.tsx",
    moduleCta: { label: "Analisi stock e consumi", href: "/magazzino" },
  },
  {
    id: "mag-pareto-consumi",
    ownership: "operational_module",
    owner: "magazzino",
    businessPurpose: "Pareto consumi ricambi",
    destination: "/magazzino",
    reason: "Ranking operativo consumi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["magazzino"],
    surfaceRef: "components/operational-analytics/magazzino-operational-panel.tsx",
  },
  {
    id: "mag-risk-tables",
    ownership: "operational_module",
    owner: "magazzino",
    businessPurpose: "Risk matrix / sotto scorta",
    destination: "/magazzino",
    reason: "Gestione scorte operativa",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["magazzino"],
    surfaceRef: "components/operational-analytics/magazzino-operational-panel.tsx",
  },
  {
    id: "mag-ricambi-ranking",
    ownership: "operational_module",
    owner: "magazzino",
    businessPurpose: "Ranking ricambi consumo",
    destination: "/magazzino",
    reason: "SSOT pagina magazzino",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["magazzino"],
    surfaceRef: "components/operational-analytics/magazzino-operational-panel.tsx",
  },
  {
    id: "mag-monthly-matrix",
    ownership: "operational_module",
    owner: "magazzino",
    businessPurpose: "Matrice mensile + edit manuale",
    destination: "/magazzino",
    reason: "Override mensili operativi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["magazzino"],
    surfaceRef: "components/operational-analytics/magazzino-operational-panel.tsx",
  },
  // —— Clienti/Mezzi ——
  {
    id: "cm-fleet",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "Disponibilità e guasti flotta",
    destination: "/mezzi",
    reason: "Executive KPI in BI; dettaglio flotta in Mezzi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
  },
  {
    id: "cm-mtbf-recidiva",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "MTBF/recidiva clienti-mezzi",
    destination: "/mezzi",
    reason: "Condiviso con analisi mezzi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi", "lavorazioni"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
  },
  {
    id: "cm-compliance",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "Compliance / lifecycle asset",
    destination: "/mezzi",
    reason: "Mezzi page è SSOT lifecycle",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
  },
  {
    id: "cm-kpi-pareto",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "KPI + pareto fatturato clienti",
    destination: "ReportClientiSection",
    reason: "Già in BI",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    surfaceRef: "components/report/bi-center/report-clienti-section.tsx",
  },
  // —— Risorse ——
  {
    id: "res-ore-dipendente",
    ownership: "operational_module",
    owner: "dipendenti",
    businessPurpose: "Ore per dipendente",
    destination: "/dipendenti",
    reason: "Dettaglio cartellino",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["dipendenti"],
    surfaceRef: "components/operational-analytics/dipendenti-operational-panel.tsx",
    moduleCta: { label: "Cartellino e ore per dipendente", href: "/dipendenti" },
  },
  {
    id: "res-timesheet-embed",
    ownership: "operational_module",
    owner: "dipendenti",
    businessPurpose: "Timesheet team",
    destination: "/dipendenti",
    reason: "Modulo presenze è SSOT",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["dipendenti"],
    surfaceRef: "components/gestionale/dipendenti/dipendenti-view.tsx",
  },
  {
    id: "res-core-kpi",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "KPI ore e trend presenze",
    destination: "ReportRisorseSection",
    reason: "Già in BI",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    surfaceRef: "components/report/bi-center/report-domain-sections.tsx",
  },
  // —— Analisi ore officina ——
  {
    id: "analisi-ore-officina-section",
    ownership: "operational_module",
    owner: "dipendenti",
    businessPurpose: "Produttività officina e utilizzo tecnici",
    destination: "/dipendenti",
    reason: "Analisi ore legata a presenze/consuntivo — owner funzionale Dipendenti (non Report)",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["dipendenti", "lavorazioni"],
    surfaceRef: "components/operational-analytics/dipendenti-operational-panel.tsx",
  },
  // —— Recidività section (defer loader) ——
  {
    id: "recidivita-mezzi-section",
    ownership: "operational_module",
    owner: "mezzi",
    businessPurpose: "Analisi recidività mezzi completa",
    destination: "/mezzi",
    reason: "Sezione dedicata spostata su Mezzi",
    readiness: "READY",
    finalStatus: "MOVED_TO_MODULE",
    rbacModules: ["mezzi", "lavorazioni"],
    surfaceRef: "components/operational-analytics/mezzi-operational-panel.tsx",
  },
  // —— Cross / AI ——
  {
    id: "analisi_ai",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Narrative assistita legacy",
    destination: "P4 Business Report + P8 Ask",
    reason: "Sostituito da Report AI e Chiedi",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "cross-cost-composition",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Composizione costo lavorazione",
    destination: "eco_margine_operativo_stimato",
    reason: "Stessa policy margin waterfall",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "cross-scatter",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Scatter correlazioni",
    destination: "—",
    reason: "Basso valore decisionale; no engine contract",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "cross-cliente-matrix",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Cliente × redditività",
    destination: "—",
    reason: "Entity matrix non certificata",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "cross-mezzo-matrix",
    ownership: "remove",
    owner: "—",
    businessPurpose: "Mezzo × costo",
    destination: "—",
    reason: "SSOT drift; basso valore",
    readiness: "REMOVED",
    finalStatus: "REMOVED",
  },
  {
    id: "cross-volume-anomaly",
    ownership: "future_capability",
    owner: "—",
    businessPurpose: "Anomalie volume chiusure",
    destination: "future lav-chiusi overlay",
    reason: "Overlay opzionale — non in Report",
    readiness: "FUTURE_CAPABILITY",
    finalStatus: "FUTURE_CAPABILITY",
    reviewTarget: "trend overlay extension",
  },
] as const;

const OWNERSHIP_BY_ID = new Map(REPORT_DATA_OWNERSHIP.map((e) => [e.id, e]));

export function getOwnershipEntry(id: string): OwnershipEntry | undefined {
  return OWNERSHIP_BY_ID.get(id);
}

/** Items still blocking P9 legacy elimination on /report. */
export function countReportResiduals(): number {
  return REPORT_DATA_OWNERSHIP.filter(
    (e) =>
      e.readiness === "NEEDS_OWNER_SURFACE" ||
      (e.ownership === "operational_module" && e.readiness !== "READY"),
  ).length;
}

export function isP9EliminationGatePassed(): boolean {
  return countReportResiduals() === 0;
}

export function listReadyModuleCtas(): readonly OwnershipEntry[] {
  return REPORT_DATA_OWNERSHIP.filter((e) => e.moduleCta && e.readiness === "READY");
}
