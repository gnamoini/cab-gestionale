import type { InsightCandidate } from "@/lib/report/insights/types";

function n(v: string | number | boolean | undefined): string {
  if (typeof v === "number") return v.toLocaleString("it-IT");
  return String(v ?? "");
}

function eur(v: string | number | boolean | undefined): string {
  const num = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(num)) return n(v);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

const MESSAGE_BY_RULE: Record<string, (p: InsightCandidate["payload"]) => string> = {
  LAV_LOAD_EXCEEDS_CLOSURES: (p) =>
    `Nel periodo sono entrate ${n(p.opened)} lavorazioni ma ne sono state chiuse ${n(p.closed)} (+${n(p.delta)} in accumulo)`,
  LAV_SLA_BREACH: (p) =>
    `${n(p.count)} lavorazioni sono oltre il termine previsto`,
  LAV_OPEN_BACKLOG: (p) =>
    `${n(p.open)} lavorazioni ancora da completare (riferimento: ${n(p.threshold)})`,
  LAV_LOW_CLOSURES: () => "Nessuna lavorazione chiusa nel periodo selezionato",
  LAV_AVG_CLOSE_SLOW: (p) =>
    `Tempo medio di chiusura elevato: ${n(p.days)} giorni`,
  LAV_MANUAL_OVERRIDE: () => "Dati lavorazioni con override manuali nel periodo",
  LAV_CLOSURES_DELTA: () => "Variazione chiusure rispetto al periodo precedente",
  MAG_LOW_STOCK: (p) =>
    `${n(p.count)} articoli sotto la scorta minima`,
  MAG_COVERAGE_CRITICAL: (p) =>
    `${n(p.count)} articoli con copertura sotto soglia (meno di ${n(p.days)} giorni stimati)`,
  MAG_DEAD_STOCK: (p) =>
    `${n(p.count)} articoli fermi senza uscite negli ultimi 90 giorni`,
  MAG_PARTS_SPIKE: (p) =>
    `Picco consumo ricambi: ${n(p.current)} nel periodo (media precedente ${n(p.avgPrev)})`,
  MAG_PARTS_USED: (p) => `${n(p.qty)} ricambi utilizzati nel periodo`,
  MAG_MOVEMENT_VALUE: (p) => `Valore movimenti magazzino: ${eur(p.value)}`,
  ORE_HOURS_LOW: () => "Nessuna ora lavorata registrata nel periodo",
  ORE_PER_JOB: (p) =>
    `Media ${n(p.avgHours)} ore per lavorazione chiusa (${n(p.hours)} ore su ${n(p.jobs)} chiusure)`,
  ORE_MAINTENANCE_COST: (p) => `Costi di manutenzione nel periodo: ${eur(p.cost)}`,
  ORE_OVERTIME: () => "Straordinari rilevati nel periodo",
  ECO_INVOICES_PENDING: () =>
    "Fatturazione non ancora disponibile per il periodo — i KPI economici potrebbero essere incompleti",
  ECO_RECEIVABLES: (p) =>
    `Crediti da incassare: ${eur(p.amount)}${p.overdue ? `, di cui scaduti ${eur(p.overdue)}` : ""}`,
  ECO_DSO_HIGH: (p) =>
    `Tempo medio di incasso elevato: ${n(p.days)} giorni (soglia ${n(p.threshold)} giorni)`,
  ECO_COLLECTION_LOW: (p) =>
    `Incassi sotto soglia: ${n(p.rate)}% riscosso (minimo atteso ${n(p.threshold)}%)`,
  ECO_MARGIN_NEGATIVE: (p) => `Margine operativo negativo: ${n(p.margin)}%`,
  ECO_CONCENTRATION_RISK: (p) =>
    `Fatturato concentrato su ${p.cliente}: ${n(p.share)}% (soglia ${n(p.threshold)}%)`,
  CROSS_COST_JOB_SPIKE: (p) =>
    `Costo medio per lavorazione in aumento: ${eur(p.costPerJob)} (+${n(p.deltaPct)}% vs periodo precedente)`,
  CROSS_VALUE_HOUR_DROP: (p) =>
    `Valore orario in calo: ${eur(p.valuePerHour)} (${n(p.deltaPct)}% vs periodo precedente)`,
  CROSS_SOURCE_PENDING: () =>
    "Analisi incrociate parziali: attendi il caricamento completo delle sezioni fonte",
  COMP_REVISION_EXPIRED: (p) =>
    `${n(p.overdueCount)} revisioni mezzo scadute`,
  COMP_SERVICE_DUE: (p) =>
    `${n(p.dueCount)} tagliandi in scadenza entro 30 giorni`,
};

export function renderInsightMessage(candidate: InsightCandidate): string {
  const render = MESSAGE_BY_RULE[candidate.ruleKey];
  if (render) return render(candidate.payload);
  return `Segnale ${candidate.ruleKey.replaceAll("_", " ").toLowerCase()}`;
}
