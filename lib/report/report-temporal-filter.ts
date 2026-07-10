import type { DateRange } from "@/lib/report/date-ranges";
import {
  intersectDateRanges,
  monthBoundsLocal,
  yearBoundsLocal,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";

/** Anni che intersecano il periodo report (inclusivi). */
export function yearsInReportRange(filterRange: DateRange): number[] {
  const y0 = filterRange.start.getFullYear();
  const y1 = filterRange.end.getFullYear();
  const out: number[] = [];
  for (let y = y0; y <= y1; y += 1) out.push(y);
  return out;
}

/** Mese (0-based) sovrapposto al periodo report. */
export function monthInReportRange(year: number, monthIndex0: number, filterRange: DateRange): boolean {
  const mb = monthBoundsLocal(year, monthIndex0 + 1);
  return intersectDateRanges(filterRange, mb) != null;
}

/** Anno solare sovrapposto al periodo report. */
export function yearInReportRange(year: number, filterRange: DateRange): boolean {
  return intersectDateRanges(filterRange, yearBoundsLocal(year)) != null;
}

/** Intersezione periodo report × anno selezionato (stessa regola sezione temporale). */
export function effectiveReportRangeForYear(filterRange: DateRange, selYear: number): DateRange {
  const yearBound = yearBoundsLocal(selYear);
  return intersectDateRanges(filterRange, yearBound) ?? yearBound;
}

export type YearMatrixFilterMode = "filtered" | "full_history";

export type YearMatrixFilterResult = {
  rows: LavorazioniYearRow[];
  mode: YearMatrixFilterMode;
  /** Anni mostrati per intero grazie a dati storici manuali / Excel. */
  manualHistoryYears: number[];
};

export function yearsFromManualMonthKeys(manualMonthKeys: ReadonlySet<string>): Set<number> {
  const years = new Set<number>();
  for (const mk of manualMonthKeys) {
    const y = Number(mk.slice(0, 4));
    if (Number.isFinite(y) && y >= 2000) years.add(y);
  }
  return years;
}

function rowBestWorstInRange(row: LavorazioniYearRow, filterRange: DateRange): {
  bestMonthIdx: number | null;
  worstMonthIdx: number | null;
} {
  const inMonths: { mi: number; v: number }[] = [];
  for (let mi = 0; mi < 12; mi += 1) {
    if (monthInReportRange(row.year, mi, filterRange)) {
      inMonths.push({ mi, v: row.months[mi] ?? 0 });
    }
  }
  if (inMonths.length === 0) {
    return { bestMonthIdx: null, worstMonthIdx: null };
  }

  let bestMonthIdx: number | null = inMonths[0]!.mi;
  let worstMonthIdx: number | null = inMonths[0]!.mi;
  for (const { mi, v } of inMonths) {
    if (v > (row.months[bestMonthIdx] ?? 0)) bestMonthIdx = mi;
    if (v < (row.months[worstMonthIdx] ?? 0)) worstMonthIdx = mi;
  }
  if ((row.months[bestMonthIdx] ?? 0) <= 0) bestMonthIdx = null;
  if ((row.months[worstMonthIdx] ?? 0) <= 0) worstMonthIdx = null;
  if (bestMonthIdx !== null && worstMonthIdx !== null && bestMonthIdx === worstMonthIdx) {
    worstMonthIdx = null;
  }
  return { bestMonthIdx, worstMonthIdx };
}

/** Applica filterRange alla matrice annuale; gli anni con dati manuali Excel restano visibili per intero. */
export function applyYearMatrixFilterRange(
  rows: readonly LavorazioniYearRow[],
  filterRange: DateRange,
  manualMonthKeys?: ReadonlySet<string>,
): YearMatrixFilterResult {
  const byYear = new Map(rows.map((r) => [r.year, r]));
  const manualYears = yearsFromManualMonthKeys(manualMonthKeys ?? new Set());
  const filterYears = yearsInReportRange(filterRange);
  const yearSet = new Set([...filterYears, ...manualYears]);
  const years = [...yearSet].sort((a, b) => a - b);
  const manualHistoryYears = [...manualYears].sort((a, b) => a - b);
  const out: LavorazioniYearRow[] = [];
  let prevFilteredTotal: number | null = null;

  for (const year of years) {
    const src = byYear.get(year);
    const months = src?.months ?? Array.from({ length: 12 }, () => 0);

    if (manualYears.has(year) && src) {
      out.push(src);
      prevFilteredTotal = src.total;
      continue;
    }

    const total = months.reduce(
      (sum, v, mi) => (monthInReportRange(year, mi, filterRange) ? sum + v : sum),
      0,
    );
    const { bestMonthIdx, worstMonthIdx } = rowBestWorstInRange(
      { year, months, total, growthVsPrevPct: null, bestMonthIdx: null, worstMonthIdx: null },
      filterRange,
    );
    const growthVsPrevPct =
      prevFilteredTotal != null && prevFilteredTotal > 0
        ? Math.round(((total - prevFilteredTotal) / prevFilteredTotal) * 1000) / 10
        : null;
    prevFilteredTotal = total;

    out.push({
      year,
      months,
      total,
      growthVsPrevPct,
      bestMonthIdx,
      worstMonthIdx,
    });
  }

  return { rows: out, mode: "filtered", manualHistoryYears };
}
