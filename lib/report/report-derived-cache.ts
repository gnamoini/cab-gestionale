/**
 * Cache derivata frontend per report (single-slot).
 *
 * - `buildReportSemanticIndex` precompute
 * - aggregazioni magazzino periodo riusabili (range + compare)
 *
 * Override manuali: `completateTotal` rispetta `manualByMonth`; spark KPI usa solo DB
 * (vedi commento in lavorazioni-report-selectors sparkFromDailyCompletions).
 */
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  buildMagazzinoMonthlyRows,
} from "@/lib/report/magazzino-monthly-rows";
import type { MagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";
import type { ReportManualByMonth } from "@/lib/report/lavorazioni-report-selectors";
import { loadMagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";
import type { ReportIntegrityQueryMeta } from "@/lib/report/report-data-integrity-layer";
import { buildReportSemanticIndex, type ReportSemanticIndex } from "@/lib/report/report-semantic-index";

export type MagPeriodAgg = {
  deltaCapitale: number;
  entrate: number;
  uscite: number;
};

export type ReportDerivedBundle = {
  fingerprint: string;
  semanticIndex: ReportSemanticIndex;
  magLogSorted: MagazzinoChangeLogEntry[];
  magMonthAggCache: Map<string, MagPeriodAgg>;
  magMonthRowsCache: Map<string, ReturnType<typeof buildMagazzinoMonthlyRows>>;
};

export type ReportDerivedInput = {
  completate: LavorazioneArchiviata[];
  manualByMonth: ReportManualByMonth;
  mezzi: MezzoGestito[];
  magLog: MagazzinoChangeLogEntry[];
  magazzino: RicambioMagazzino[];
  queryMeta: readonly ReportIntegrityQueryMeta[];
  /** Revisione override storico magazzino (localStorage) — invalida cache al save manuale. */
  magManualRevision?: number;
};

export function dateRangeKey(r: DateRange): string {
  return `${r.start.getTime()}-${r.end.getTime()}`;
}

function manualByMonthRevision(m: ReportManualByMonth): number {
  let sum = 0;
  for (const v of m.values()) sum += v;
  return m.size * 1000 + sum;
}

function magLogContentHint(magLog: readonly MagazzinoChangeLogEntry[]): string {
  if (magLog.length === 0) return "0";
  const sorted =
    magLog.length <= 1
      ? magLog
      : [...magLog].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return `${first.at}:${first.id}|${last.at}:${last.id}`;
}

/** Fingerprint cheap per invalidare cache derivata. */
export function fingerprintReportSnapshot(input: {
  completate: readonly unknown[];
  magLog: readonly MagazzinoChangeLogEntry[];
  magazzino: readonly unknown[];
  manualByMonth: ReportManualByMonth;
  queryMeta: readonly ReportIntegrityQueryMeta[];
  magManualRevision?: number;
}): string {
  const ts = input.queryMeta.map((q) => `${q.source}:${q.dataUpdatedAt}:${q.rowCount}:${q.isError ? 1 : 0}`).join("|");
  return [
    input.completate.length,
    input.magLog.length,
    magLogContentHint(input.magLog),
    input.magazzino.length,
    manualByMonthRevision(input.manualByMonth),
    input.magManualRevision ?? 0,
    ts,
  ].join(":");
}

function sortMagLog(magLog: MagazzinoChangeLogEntry[]): MagazzinoChangeLogEntry[] {
  if (magLog.length <= 1) return magLog;
  return [...magLog].sort((a, b) => a.at.localeCompare(b.at));
}

function computeMagPeriodAggFromRows(rows: ReturnType<typeof buildMagazzinoMonthlyRows>["rows"]): MagPeriodAgg {
  return rows.reduce(
    (acc, row) => ({
      deltaCapitale: acc.deltaCapitale + row.deltaCapitale,
      entrate: acc.entrate + row.entrate,
      uscite: acc.uscite + row.uscite,
    }),
    { deltaCapitale: 0, entrate: 0, uscite: 0 },
  );
}

function getOrBuildMagMonthRows(
  bundle: ReportDerivedBundle,
  prodotti: RicambioMagazzino[],
  range: DateRange,
  anchor: Date,
  manual?: MagazzinoManualMonthMap,
): ReturnType<typeof buildMagazzinoMonthlyRows> {
  const key = dateRangeKey(range);
  const hit = bundle.magMonthRowsCache.get(key);
  if (hit) return hit;
  const manualMap = manual ?? loadMagazzinoManualMonthMap();
  const result = buildMagazzinoMonthlyRows(bundle.magLogSorted, prodotti, range, anchor, manualMap);
  bundle.magMonthRowsCache.set(key, result);
  return result;
}

let lastFingerprint: string | null = null;
let lastBundle: ReportDerivedBundle | null = null;

export function buildReportDerivedBundle(input: ReportDerivedInput): ReportDerivedBundle {
  const fingerprint = fingerprintReportSnapshot({
    completate: input.completate,
    magLog: input.magLog,
    magazzino: input.magazzino,
    manualByMonth: input.manualByMonth,
    queryMeta: input.queryMeta,
    magManualRevision: input.magManualRevision,
  });
  if (lastFingerprint === fingerprint && lastBundle) {
    return lastBundle;
  }

  const magLogSorted = sortMagLog(input.magLog as MagazzinoChangeLogEntry[]);
  const semanticIndex = buildReportSemanticIndex({
    completate: input.completate,
    manualByMonth: input.manualByMonth,
    mezzi: input.mezzi,
  });

  const bundle: ReportDerivedBundle = {
    fingerprint,
    semanticIndex,
    magLogSorted,
    magMonthAggCache: new Map(),
    magMonthRowsCache: new Map(),
  };

  lastFingerprint = fingerprint;
  lastBundle = bundle;
  return bundle;
}

/** Reset cache (test). */
export function resetReportDerivedCacheForTests(): void {
  lastFingerprint = null;
  lastBundle = null;
}

export function getMagPeriodAgg(
  bundle: ReportDerivedBundle,
  magazzino: RicambioMagazzino[],
  range: DateRange,
  anchor: Date,
): MagPeriodAgg {
  const key = dateRangeKey(range);
  const hit = bundle.magMonthAggCache.get(key);
  if (hit) return hit;
  const { rows } = getOrBuildMagMonthRows(bundle, magazzino, range, anchor);
  const agg = computeMagPeriodAggFromRows(rows);
  bundle.magMonthAggCache.set(key, agg);
  return agg;
}

/** Righe mensili magazzino via log ordinato condiviso con KPI (single pipeline + cache). */
export function getMagazzinoMonthlyRowsForRange(
  bundle: ReportDerivedBundle,
  prodotti: RicambioMagazzino[],
  range: DateRange,
  anchor: Date,
  manual: MagazzinoManualMonthMap,
): ReturnType<typeof buildMagazzinoMonthlyRows> {
  return getOrBuildMagMonthRows(bundle, prodotti, range, anchor, manual);
}
