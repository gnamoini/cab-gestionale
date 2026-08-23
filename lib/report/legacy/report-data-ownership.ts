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

/** SSOT: functional ownership — analytics live in /report/* hub areas. */
export const REPORT_DATA_OWNERSHIP: readonly OwnershipEntry[] = [
  // —— Lavorazioni WIP/aging ——
  {
    id: "lav-aging-backlog",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Aging backlog per stato — gestione WIP",
    destination: "/report/lavorazioni",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
  },
  {
    id: "lav-stato-aging-matrix",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Matrice stato × aging",
    destination: "/report/lavorazioni",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
  },
  {
    id: "lav-wip-funnel",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Funnel WIP per stato",
    destination: "/report/lavorazioni",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
  },
  {
    id: "lav-close-time-priorita",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Tempi chiusura per priorità",
    destination: "/report/lavorazioni",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
  },
  {
    id: "lav-sla-table",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Interventi oltre SLA — dettaglio righe",
    destination: "/report/lavorazioni",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
  },
  {
    id: "lav-recidiva",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Recidiva mezzi",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
  },
  {
    id: "lav-mtbf",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "MTBF/MTTR per mezzo",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
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
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Import dati storici Excel",
    destination: "/report/lavorazioni",
    reason: "Ingestione storica nell'area Report lavorazioni",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-lavorazioni-view.tsx",
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
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Valore stock per categoria",
    destination: "/report/magazzino",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "magazzino"],
    surfaceRef: "components/report/areas/report-area-magazzino-view.tsx",
  },
  {
    id: "mag-pareto-consumi",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Pareto consumi ricambi",
    destination: "/report/magazzino",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "magazzino"],
    surfaceRef: "components/report/areas/report-area-magazzino-view.tsx",
  },
  {
    id: "mag-risk-tables",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Risk matrix / sotto scorta",
    destination: "/report/magazzino",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "magazzino"],
    surfaceRef: "components/report/areas/report-area-magazzino-view.tsx",
  },
  {
    id: "mag-ricambi-ranking",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Ranking ricambi consumo",
    destination: "/report/magazzino",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "magazzino"],
    surfaceRef: "components/report/areas/report-area-magazzino-view.tsx",
  },
  {
    id: "mag-monthly-matrix",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Matrice mensile + edit manuale",
    destination: "/report/magazzino",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "magazzino"],
    surfaceRef: "components/report/areas/report-area-magazzino-view.tsx",
  },
  // —— Clienti/Mezzi ——
  {
    id: "cm-fleet",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Disponibilità e guasti flotta",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
  },
  {
    id: "cm-mtbf-recidiva",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "MTBF/recidiva clienti-mezzi",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
  },
  {
    id: "cm-compliance",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Compliance / lifecycle asset",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
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
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Ore per dipendente",
    destination: "/report/dipendenti",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "dipendenti"],
    surfaceRef: "components/report/areas/report-area-dipendenti-view.tsx",
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
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Produttività officina e utilizzo tecnici",
    destination: "/report/dipendenti",
    reason: "Analytics concentrate in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "dipendenti", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-dipendenti-view.tsx",
  },
  {
    id: "recidivita-mezzi-section",
    ownership: "bi_report",
    owner: "report",
    businessPurpose: "Analisi recidività mezzi completa",
    destination: "/report/mezzi",
    reason: "Analytics flotta in Report hub",
    readiness: "READY",
    finalStatus: "MOVED_TO_BI",
    rbacModules: ["report", "mezzi", "lavorazioni"],
    surfaceRef: "components/report/areas/report-area-mezzi-view.tsx",
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
