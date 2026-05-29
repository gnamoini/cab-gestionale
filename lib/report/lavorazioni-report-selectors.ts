import {
  isReportArchivioCompletataRow,
  lavorazioneListRowToArchiviata,
  splitLavorazioniListRowsForReport,
} from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import {
  endOfLocalDay,
  isoInRange,
  startOfLocalDay,
  type DateRange,
} from "@/lib/report/date-ranges";
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

function monthKeyFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function countDbCompletedByMonth(completate: LavorazioneArchiviata[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const x of completate) {
    if (!x.dataCompletamento) continue;
    const mk = monthKeyFromIso(x.dataCompletamento);
    if (!mk) continue;
    map.set(mk, (map.get(mk) ?? 0) + 1);
  }
  return map;
}

/** Mesi YYYY-MM che intersecano il range (inclusivo). */
export function monthKeysOverlappingRange(range: DateRange): string[] {
  const keys: string[] = [];
  let y = range.start.getFullYear();
  let mo = range.start.getMonth();
  const endY = range.end.getFullYear();
  const endMo = range.end.getMonth();
  while (y < endY || (y === endY && mo <= endMo)) {
    keys.push(`${y}-${String(mo + 1).padStart(2, "0")}`);
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
  }
  return keys;
}

function countCompletateInMonthWithinRange(
  completate: LavorazioneArchiviata[],
  monthKey: string,
  range: DateRange,
): number {
  let n = 0;
  for (const x of completate) {
    if (!x.dataCompletamento) continue;
    const mk = monthKeyFromIso(x.dataCompletamento);
    if (mk !== monthKey) continue;
    if (isoInRange(x.dataCompletamento, range)) n += 1;
  }
  return n;
}

/** Conteggio mensile DB + override manuale (sostituisce il mese intero). */
export function countCompletedByMonth(
  completate: LavorazioneArchiviata[],
  manualByMonth?: ReportManualByMonth,
): Map<string, number> {
  const merged = countDbCompletedByMonth(completate);
  if (!manualByMonth) return merged;
  for (const [k, v] of manualByMonth) merged.set(k, v);
  return merged;
}

/** Completate nel periodo: per mesi con override manuale usa il valore manuale. */
export function countCompletedInRange(
  completate: LavorazioneArchiviata[],
  range: DateRange,
  manualByMonth?: ReportManualByMonth,
): number {
  if (!manualByMonth || manualByMonth.size === 0) {
    let n = 0;
    for (const x of completate) {
      if (x.dataCompletamento && isoInRange(x.dataCompletamento, range)) n += 1;
    }
    return n;
  }
  let total = 0;
  for (const mk of monthKeysOverlappingRange(range)) {
    const manual = manualByMonth.get(mk);
    if (manual != null) total += manual;
    else total += countCompletateInMonthWithinRange(completate, mk, range);
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

export function avgCloseDays(completate: LavorazioneArchiviata[], range: DateRange): number {
  const vals: number[] = [];
  const ms = (a: string, b: string) => {
    const t0 = new Date(a).getTime();
    const t1 = new Date(b).getTime();
    if (Number.isNaN(t0) || Number.isNaN(t1)) return 0;
    return Math.max(0, (t1 - t0) / 86400000);
  };
  for (const x of completate) {
    if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, range)) continue;
    const g = ms(x.dataIngresso, x.dataCompletamento);
    if (g > 0) vals.push(g);
  }
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
