/**
 * Presentation-only business labels for Report UI.
 * Backend DTOs, APIs, and registry keep metricId + technical metadata.
 */
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

export type ReportBusinessLabel = {
  /** Primary user-facing title — never bare SLA/WIP/MTBF alone */
  title: string;
  /** Compact KPI card title when space is tight */
  shortTitle?: string;
  subtitle?: string;
  /** Secondary technical term (e.g. "SLA") shown below title when useful */
  technicalTerm?: string;
  tooltip?: string;
};

export type ReportSectionCopy = {
  title: string;
  subtitle?: string;
};

const METRIC_LABELS: Readonly<Record<string, ReportBusinessLabel>> = {
  "lav-chiusi": {
    title: "Lavorazioni chiuse nel periodo",
    shortTitle: "Chiusure",
    subtitle: "Completate nel periodo",
    technicalTerm: "Chiusure",
    tooltip: "Numero di lavorazioni completate nel periodo selezionato.",
  },
  "lav-aperti": {
    title: "Lavorazioni ancora da completare",
    technicalTerm: "Backlog",
    tooltip: "Interventi aperti e non ancora archiviati.",
  },
  lav_late_sla: {
    title: "Lavorazioni oltre il termine previsto",
    technicalTerm: "SLA",
    tooltip: "SLA = termine previsto per completare la lavorazione.",
  },
  "lav-periodo": {
    title: "Nuove lavorazioni nel periodo",
    subtitle: "Ingressi nel periodo",
  },
  "lav-tempo": {
    title: "Tempo medio di chiusura",
    subtitle: "Giorni tra apertura e chiusura",
  },
  lav_cancelled: {
    title: "Lavorazioni annullate",
    subtitle: "Nel periodo (data ingresso)",
  },
  eco_fatturato: {
    title: "Quanto abbiamo fatturato?",
    shortTitle: "Fatturato",
    subtitle: "Emesso nel periodo",
  },
  eco_incassato: {
    title: "Quanto abbiamo incassato?",
    shortTitle: "Incassato",
    subtitle: "Pagamenti nel periodo",
  },
  eco_da_incassare: {
    title: "Fatture ancora da incassare",
    shortTitle: "Da incassare",
    subtitle: "Residuo crediti aperti",
  },
  eco_importo_scaduto: {
    title: "Fatture già scadute",
    shortTitle: "Scadute",
    subtitle: "Importo con scadenza passata",
    tooltip: "Fotografia al giorno corrente dei crediti scaduti.",
  },
  eco_margine_operativo_stimato: {
    title: "Guadagno operativo stimato",
    shortTitle: "Margine stimato",
    technicalTerm: "Margine operativo",
    tooltip: "Stima basata su fatturato e costi noti nel periodo.",
  },
  eco_preventivi: { title: "Preventivi emessi", shortTitle: "Preventivi", subtitle: "Volume nel periodo" },
  eco_preventivi_approvati: {
    title: "Preventivi approvati",
    shortTitle: "Approvati",
    subtitle: "Accettati dal cliente nel periodo",
  },
  eco_preventivi_valore: {
    title: "Valore dei preventivi emessi",
    shortTitle: "Valore",
    subtitle: "Importo totale nel periodo",
  },
  win_rate_preventivi: {
    title: "Quanti preventivi vengono accettati",
    shortTitle: "Accettazione",
    subtitle: "Sulle decisioni cliente chiuse",
    tooltip: "Accettati ÷ (accettati + rifiutati) nel periodo.",
  },
  eco_ddt: { title: "Documenti di trasporto", shortTitle: "DDT", subtitle: "Volume logistica" },
  scorta: {
    title: "Ricambi sotto la scorta minima",
    subtitle: "Criticità disponibilità magazzino",
  },
  "ric-usati": {
    title: "Consumo ricambi",
    subtitle: "Ricambi utilizzati nel periodo",
  },
  cap: {
    title: "Valore immobilizzato in magazzino",
    technicalTerm: "Capitale immobilizzato",
  },
  mag_movement_value: { title: "Valore movimentato", subtitle: "Flusso ricambi nel periodo" },
  mag_orders: { title: "Ordini ai fornitori", subtitle: "Nel periodo" },
  clienti: { title: "Clienti attivi", subtitle: "Con attività nel periodo" },
  presence_hours_total: { title: "Ore di presenza", subtitle: "Cartellino nel periodo" },
  actual_labor_hours_total: { title: "Ore consuntive", subtitle: "Da schede lavorazione" },
  ore_straordinari: { title: "Ore straordinarie", subtitle: "Nel periodo" },
  saturazione_team: {
    title: "Utilizzo della capacità dell'officina",
    shortTitle: "Saturazione officina",
    technicalTerm: "Saturazione team",
    tooltip: "Rapporto tra ore lavorate e capacità disponibile.",
  },
  "flotta-officina": { title: "Mezzi in officina", subtitle: "Proxy disponibilità flotta" },
  cross_efficiency: { title: "Chiusure per ora lavorata", subtitle: "Efficienza operativa" },
  cross_parts_job: { title: "Ricambi per intervento", subtitle: "Consumo medio" },
  cross_cost_job: { title: "Costo medio per lavorazione", subtitle: "Stima periodo" },
  cross_value_hour: { title: "Valore per ora", subtitle: "Produttività economica" },
};

const SECTION_COPY: Readonly<Record<string, ReportSectionCopy>> = {
  executive: {
    title: "Come sta andando l'azienda?",
    subtitle: "Indicatori principali del periodo",
  },
  primaryTrend: {
    title: "Andamento",
    subtitle: "Trend principale — evoluzione nel tempo",
  },
  historical: {
    title: "Trend storico",
    subtitle: "Ultime 12 settimane o 12 mesi — periodo toolbar invariato",
  },
  economia: {
    title: "Economia",
    subtitle: "Fatturato, incassi, crediti e margine stimato",
  },
  lavorazioni: {
    title: "Lavorazioni",
    subtitle: "Ingressi, chiusure e tempi nel periodo",
  },
  magazzino: {
    title: "Magazzino",
    subtitle: "Disponibilità, consumi e ordini",
  },
  clienti: {
    title: "Clienti",
    subtitle: "Ricavi e concentrazione nel periodo",
  },
  risorse: {
    title: "Risorse e officina",
    subtitle: "Ore, capacità e utilizzo del team",
  },
  preventivi: {
    title: "Preventivi e commerciale",
    subtitle: "Volume, valore e accettazione nel periodo",
  },
  cross: {
    title: "Analisi incrociate",
    subtitle: "Relazioni tra aree — senza inferenze causali",
  },
  operationalContext: {
    title: "Cosa sta succedendo operativamente?",
    subtitle: "I segnali da monitorare nel periodo",
  },
  timeline: {
    title: "Cronologia operativa",
    subtitle: "Eventi, insight e note del periodo",
  },
  decisionCenter: {
    title: "Decisioni da valutare",
    subtitle: "Situazioni che meritano attenzione — supporto, non automazione",
  },
};

/** Default historical metric ids — selector shows business titles */
export const HISTORICAL_DEFAULT_METRIC_IDS = ["eco_fatturato", "lav-chiusi", "ric-usati"] as const;

/** Executive + P0 metrics that must have explicit business labels */
export const P10_LABELED_METRIC_IDS = [
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
  "eco_fatturato",
  "eco_da_incassare",
  "eco_importo_scaduto",
  "eco_incassato",
  "eco_margine_operativo_stimato",
  "scorta",
  "ric-usati",
  "saturazione_team",
] as const;

/** Primary titles must not match these patterns (bare technical terms) */
export const FORBIDDEN_PRIMARY_TITLE_PATTERNS: readonly RegExp[] = [
  /^SLA$/i,
  /^WIP$/i,
  /^MTBF$/i,
  /^MTTR$/i,
  /^DSO$/i,
  /^AR Aging$/i,
  /^KPI$/i,
  /^EBITDA$/i,
  /^ROI$/i,
  /^Oltre SLA$/i,
  /^Backlog$/i,
  /^Executive Overview$/i,
  /^Operations Timeline$/i,
];

export function getReportBusinessLabel(metricId: string): ReportBusinessLabel {
  const custom = METRIC_LABELS[metricId];
  if (custom) return custom;
  const registry = getRegistryEntry(metricId);
  return { title: registry?.label ?? metricId, subtitle: registry?.description };
}

/** Second line for pickers/lists — subtitle, else technical term, else trimmed registry description. */
export function getReportBusinessLabelHint(metricId: string): string | undefined {
  const label = getReportBusinessLabel(metricId);
  if (label.subtitle?.trim()) return label.subtitle.trim();
  if (label.technicalTerm?.trim()) return label.technicalTerm.trim();
  const registry = getRegistryEntry(metricId);
  const desc = registry?.description?.trim();
  if (!desc) return undefined;
  return desc.length > 72 ? `${desc.slice(0, 69)}…` : desc;
}

/** KPI card copy — compact uses shortTitle + subtitle hint. */
export function getReportBusinessLabelCardCopy(
  metricId: string,
  compact: boolean,
): { title: string; hint?: string; tooltip?: string } {
  const label = getReportBusinessLabel(metricId);
  const tooltip = label.tooltip ?? label.title;

  if (compact) {
    const title = label.shortTitle ?? label.subtitle ?? label.title;
    const hint =
      label.shortTitle && label.subtitle
        ? label.subtitle
        : label.technicalTerm && label.technicalTerm !== title
          ? label.technicalTerm
          : undefined;
    return { title, hint, tooltip };
  }

  return {
    title: label.title,
    hint: label.subtitle ?? label.technicalTerm,
    tooltip,
  };
}

export function getReportSectionCopy(sectionKey: string): ReportSectionCopy {
  return SECTION_COPY[sectionKey] ?? { title: sectionKey };
}

export function isForbiddenPrimaryTitle(title: string): boolean {
  const t = title.trim();
  return FORBIDDEN_PRIMARY_TITLE_PATTERNS.some((re) => re.test(t));
}
