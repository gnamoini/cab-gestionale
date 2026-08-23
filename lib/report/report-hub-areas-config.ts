export type ReportHubAreaId =
  | "panoramica"
  | "lavorazioni"
  | "magazzino"
  | "dipendenti"
  | "preventivi"
  | "mezzi"
  | "economia"
  | "clienti"
  | "trasversali"
  | "contesto"
  | "ai";

export type ReportHubAreaConfig = {
  id: ReportHubAreaId;
  label: string;
  description: string;
  href: `/report/${ReportHubAreaId}`;
  order: number;
  testId: string;
};

export const REPORT_HUB_AREAS: readonly ReportHubAreaConfig[] = [
  {
    id: "panoramica",
    label: "Panoramica",
    description: "Executive overview, trend principali, insight e storico",
    href: "/report/panoramica",
    order: 1,
    testId: "report-hub-card-panoramica",
  },
  {
    id: "lavorazioni",
    label: "Lavorazioni",
    description: "Throughput, WIP, aging, SLA e performance officina",
    href: "/report/lavorazioni",
    order: 2,
    testId: "report-hub-card-lavorazioni",
  },
  {
    id: "magazzino",
    label: "Magazzino",
    description: "Stock, consumi, rotazioni e rischio scorte",
    href: "/report/magazzino",
    order: 3,
    testId: "report-hub-card-magazzino",
  },
  {
    id: "dipendenti",
    label: "Dipendenti",
    description: "Ore, produttività, carico e analisi officina",
    href: "/report/dipendenti",
    order: 4,
    testId: "report-hub-card-dipendenti",
  },
  {
    id: "preventivi",
    label: "Preventivi",
    description: "Volume, valore, accettazione e marginalità",
    href: "/report/preventivi",
    order: 5,
    testId: "report-hub-card-preventivi",
  },
  {
    id: "mezzi",
    label: "Mezzi",
    description: "Flotta, disponibilità, recidività e MTBF",
    href: "/report/mezzi",
    order: 6,
    testId: "report-hub-card-mezzi",
  },
  {
    id: "economia",
    label: "Economia",
    description: "Ricavi, costi, margini e risultati economici",
    href: "/report/economia",
    order: 7,
    testId: "report-hub-card-economia",
  },
  {
    id: "clienti",
    label: "Clienti",
    description: "KPI clienti, andamento e distribuzione fatturato",
    href: "/report/clienti",
    order: 8,
    testId: "report-hub-card-clienti",
  },
  {
    id: "trasversali",
    label: "Analisi trasversali",
    description: "Metriche e trend cross-domain tra ambiti",
    href: "/report/trasversali",
    order: 9,
    testId: "report-hub-card-trasversali",
  },
  {
    id: "contesto",
    label: "Contesto",
    description: "Contesto operativo, eventi e timeline",
    href: "/report/contesto",
    order: 10,
    testId: "report-hub-card-contesto",
  },
  {
    id: "ai",
    label: "Report AI",
    description: "Report AI, Chiedi al Report e Centro decisioni",
    href: "/report/ai",
    order: 11,
    testId: "report-hub-card-ai",
  },
] as const;

export function reportHubAreasSorted(): ReportHubAreaConfig[] {
  return [...REPORT_HUB_AREAS].sort((a, b) => a.order - b.order);
}

export function getReportHubArea(id: ReportHubAreaId): ReportHubAreaConfig | undefined {
  return REPORT_HUB_AREAS.find((a) => a.id === id);
}

/** Legacy anchor ids from monolithic BI center → hub area route. */
export const REPORT_LEGACY_ANCHOR_REDIRECTS: Readonly<Record<string, `/report/${ReportHubAreaId}`>> = {
  "bi-executive": "/report/panoramica",
  "bi-trend": "/report/panoramica",
  "bi-insight": "/report/panoramica",
  "bi-historical": "/report/panoramica",
  "bi-context": "/report/contesto",
  "bi-timeline": "/report/contesto",
  "bi-advanced": "/report/lavorazioni",
  "bi-decisions": "/report/ai",
  "bi-business-report": "/report/ai",
  "bi-ask": "/report/ai",
};

export function resolveLegacyReportAnchor(hash: string): `/report/${ReportHubAreaId}` | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;
  return REPORT_LEGACY_ANCHOR_REDIRECTS[id] ?? null;
}
