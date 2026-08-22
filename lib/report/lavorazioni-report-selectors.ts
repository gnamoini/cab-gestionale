import {
  isReportArchivioCompletataRow,
  lavorazioneListRowToArchiviata,
  splitLavorazioniListRowsForReport,
} from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { permanenzaGiorniInteri } from "@/lib/lavorazioni/duration";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import {
  endOfLocalDay,
  isoInRange,
  monthRangeFromKey,
  startOfLocalDay,
  type DateRange,
} from "@/lib/report/date-ranges";
import {
  buildCompletateDbMaps,
  mergeManualMonthMap,
  reportMonthKeyFromArchiviata,
} from "@/lib/report/report-completate-maps";
import { monthKeysOverlappingRange } from "@/lib/report/month-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type ReportLavorazioniBundle = {
  attive: LavorazioneAttiva[];
  /** Tutte le archiviate (con o senza data chiusura). */
  storico: LavorazioneArchiviata[];
  /** Archiviate con data chiusura persistente — unica fonte metriche «completate». */
  completate: LavorazioneArchiviata[];
};

export type ReportManualByMonth = Map<string, number>;

/**
 * @param rows Lista completa (attive + archivio) per ingressi e conteggi in corso.
 * @param archivioRows Opzionale: fetch dedicato `archived=true` — source-of-truth per completate.
 */
export function buildReportLavorazioniBundle(
  rows: LavorazioneListRow[],
  archivioRows?: LavorazioneListRow[],
): ReportLavorazioniBundle {
  const { attive, storico } = splitLavorazioniListRowsForReport(rows);
  const archSource =
    archivioRows ?? rows.filter((r) => !r.deleted_at && isLavorazioneArchived(r));
  const completate: LavorazioneArchiviata[] = [];
  const seen = new Set<string>();
  for (const r of archSource) {
    if (!isReportArchivioCompletataRow(r)) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    completate.push(lavorazioneListRowToArchiviata(r));
  }
  return { attive, storico, completate };
}

function countDbCompletedByMonth(completate: LavorazioneArchiviata[]): Map<string, number> {
  return buildCompletateDbMaps(completate).byMonth;
}

export { monthKeysOverlappingRange } from "@/lib/report/month-keys";

function archiviataCompletionInRange(x: LavorazioneArchiviata, range: DateRange): boolean {
  if (x.dataCompletamento?.trim()) {
    return isoInRange(x.dataCompletamento, range);
  }
  const mk = x.meseCompletamento?.trim().slice(0, 7);
  if (!mk) return false;
  const monthRange = monthRangeFromKey(mk);
  if (!monthRange) return false;
  return intersectDateRanges(range, monthRange) != null;
}

function countCompletateInMonthWithinRange(
  completate: readonly LavorazioneArchiviata[],
  monthKey: string,
  range: DateRange,
): number {
  let n = 0;
  for (const x of completate) {
    if (reportMonthKeyFromArchiviata(x) !== monthKey) continue;
    if (archiviataCompletionInRange(x, range)) n += 1;
  }
  return n;
}

/** Conteggio mensile calendario — stessa semantica del grafico ingressi/chiusure. */
export function countCompletedForCalendarMonth(
  completate: readonly LavorazioneArchiviata[],
  monthKey: string,
  range: DateRange,
  manualByMonth?: ReportManualByMonth,
): number {
  const monthRange = monthRangeFromKey(monthKey);
  if (!monthRange) return 0;
  const slice = intersectDateRanges(range, monthRange);
  if (!slice) return 0;
  const closedByMonth = countCompletedByMonth([...completate], manualByMonth);
  if (closedByMonth.has(monthKey)) {
    return closedByMonth.get(monthKey) ?? 0;
  }
  return countCompletateInMonthWithinRange(completate, monthKey, slice);
}

/** Conteggio mensile DB + override manuale (sostituisce il mese intero). */
export function countCompletedByMonth(
  completate: LavorazioneArchiviata[],
  manualByMonth?: ReportManualByMonth,
): Map<string, number> {
  return mergeManualMonthMap(countDbCompletedByMonth(completate), manualByMonth);
}

/** Completate nel periodo: per mesi con override manuale usa il valore manuale. */
export function countCompletedInRange(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  manualByMonth?: ReportManualByMonth,
): number {
  if (!manualByMonth || manualByMonth.size === 0) {
    let n = 0;
    for (const x of completate) {
      if (archiviataCompletionInRange(x, range)) n += 1;
    }
    return n;
  }
  let total = 0;
  for (const mk of monthKeysOverlappingRange(range)) {
    const manual = manualByMonth.get(mk);
    if (manual !== undefined && manual !== 0) {
      total += manual;
    } else {
      total += countCompletateInMonthWithinRange(completate, mk, range);
    }
  }
  return total;
}

export function countOpenedInRange(
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
  range: DateRange,
): number {
  let n = 0;
  for (const x of attive) if (isoInRange(x.dataIngresso, range)) n += 1;
  for (const x of storico) if (isoInRange(x.dataIngresso, range)) n += 1;
  return n;
}

function closeDaysBetween(ingresso: string, chiusura: string): number {
  return permanenzaGiorniInteri(ingresso, chiusura);
}

/** Giorni chiusura per ogni archiviata nel periodo (per mediana/P90). */
export function closeDaysValuesInRange(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): number[] {
  const vals: number[] = [];
  for (const x of completate) {
    if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, range)) continue;
    const g = closeDaysBetween(x.dataIngresso, x.dataCompletamento);
    if (g > 0) vals.push(g);
  }
  return vals;
}

export function closeDaysPercentiles(vals: readonly number[]): { median: number; p90: number } {
  if (vals.length === 0) return { median: 0, p90: 0 };
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? median;
  return {
    median: Math.round(median * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
  };
}

export function avgCloseDays(completate: LavorazioneArchiviata[], range: DateRange): number {
  const vals = closeDaysValuesInRange(completate, range);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

function addClienteToSet(s: Set<string>, cliente: string) {
  const t = cliente.trim();
  if (t) s.add(t);
}

/** Clienti con almeno una chiusura archivio nel periodo (solo completate persistite). */
export function uniqueClientiServiti(completate: LavorazioneArchiviata[], range: DateRange): number {
  const s = new Set<string>();
  for (const x of completate) {
    if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, range)) continue;
    addClienteToSet(s, x.cliente);
  }
  return s.size;
}

/**
 * Clienti distinti con attività nel periodo: ingresso (in corso o archivio) o chiusura archivio.
 * Esclude eliminate (già filtrate in `splitLavorazioniListRowsForReport` / bundle completate).
 */
export function uniqueClientiNelPeriodo(
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
  completate: LavorazioneArchiviata[],
  range: DateRange,
): number {
  const s = new Set<string>();
  for (const x of attive) {
    if (isoInRange(x.dataIngresso, range)) addClienteToSet(s, x.cliente);
  }
  for (const x of storico) {
    if (isoInRange(x.dataIngresso, range)) addClienteToSet(s, x.cliente);
  }
  for (const x of completate) {
    if (x.dataCompletamento && isoInRange(x.dataCompletamento, range)) addClienteToSet(s, x.cliente);
  }
  return s.size;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

/** Spark giornaliero: solo completate DB (override mensili non distribuiti per giorno). */
export function sparkFromDailyCompletions(completate: LavorazioneArchiviata[], end: Date): number[] {
  const days = 7;
  const out = Array.from({ length: days }, () => 0);
  for (let i = 0; i < days; i++) {
    const dayStart = startOfLocalDay(addDays(end, -(days - 1 - i)));
    const dayEnd = endOfLocalDay(dayStart);
    const r: DateRange = { start: dayStart, end: dayEnd };
    out[i] = countCompletedInRange(completate, r);
  }
  return out;
}
