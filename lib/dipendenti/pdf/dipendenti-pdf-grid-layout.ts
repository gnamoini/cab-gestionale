import type { TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";

/** Margini laterali tabella PDF complessivo (A4 landscape). */
export const TIMESHEET_PDF_SIDE_MARGIN_MM = 4;

export const TIMESHEET_PDF_NAME_COL_MAX_MM = 12;

export const TIMESHEET_PDF_TOT_COL_MM = 8.5;

/** Larghezza minima colonna giorno (leggibilità `8 FES` a font 7). */
export const TIMESHEET_PDF_MIN_DAY_COL_MM = 8.8;

/** Peso relativo larghezza colonna giorno — solo layout PDF, non dati. */
export const TIMESHEET_DAY_COL_WEIGHT = {
  weekday: 1.0,
  saturday: 0.78,
  sunday: 0.72,
} as const;

/** Larghezza uniforme legacy (tutti i giorni uguali) — per confronto audit. */
export function legacyUniformDayColWidth(pageW: number, dayCount: number): number {
  const tableW = pageW - TIMESHEET_PDF_SIDE_MARGIN_MM * 2;
  const nameColW = Math.min(tableW * 0.06, TIMESHEET_PDF_NAME_COL_MAX_MM);
  const dayBudget = tableW - nameColW - TIMESHEET_PDF_TOT_COL_MM;
  return dayBudget / dayCount;
}

export function timesheetDayColumnWeight(day: TimesheetDayInfo): number {
  if (day.weekdayShort === "dom") return TIMESHEET_DAY_COL_WEIGHT.sunday;
  if (day.weekdayShort === "sab") return TIMESHEET_DAY_COL_WEIGHT.saturday;
  return TIMESHEET_DAY_COL_WEIGHT.weekday;
}

export type TimesheetGridColumnWidths = {
  tableW: number;
  nameColW: number;
  totColW: number;
  dayColWidths: number[];
};

function applyMinDayColumnWidths(
  dayColWidths: readonly number[],
  days: readonly TimesheetDayInfo[],
  dayBudget: number,
  minW: number,
): number[] {
  const widths = dayColWidths.map((w) => Math.max(w, minW));
  const sum = widths.reduce((acc, w) => acc + w, 0);
  const excess = sum - dayBudget;
  if (excess <= 0.001) return widths;

  const weekdayIndexes = days
    .map((d, i) => (timesheetDayColumnWeight(d) === TIMESHEET_DAY_COL_WEIGHT.weekday ? i : -1))
    .filter((i) => i >= 0);
  if (weekdayIndexes.length === 0) return widths;

  const weekdayTotal = weekdayIndexes.reduce((acc, i) => acc + widths[i]!, 0);
  if (weekdayTotal <= excess) {
    const scale = dayBudget / sum;
    return widths.map((w) => w * scale);
  }

  for (const i of weekdayIndexes) {
    const share = widths[i]! / weekdayTotal;
    widths[i] = widths[i]! - excess * share;
  }

  const drift = dayBudget - widths.reduce((acc, w) => acc + w, 0);
  if (Math.abs(drift) > 0.001 && weekdayIndexes.length > 0) {
    widths[weekdayIndexes[0]!] = widths[weekdayIndexes[0]!]! + drift;
  }
  return widths;
}

/** Distribuisce il budget giorni in base a feriale / sab / dom (somma = tableW). */
export function computeTimesheetGridColumnWidths(
  pageW: number,
  days: readonly TimesheetDayInfo[],
): TimesheetGridColumnWidths {
  const tableW = pageW - TIMESHEET_PDF_SIDE_MARGIN_MM * 2;
  const nameColW = Math.min(tableW * 0.06, TIMESHEET_PDF_NAME_COL_MAX_MM);
  const totColW = TIMESHEET_PDF_TOT_COL_MM;
  const dayBudget = tableW - nameColW - totColW;
  const weights = days.map(timesheetDayColumnWeight);
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  const weighted =
    sumWeights > 0 ? weights.map((w) => (dayBudget * w) / sumWeights) : [];
  const dayColWidths = applyMinDayColumnWidths(weighted, days, dayBudget, TIMESHEET_PDF_MIN_DAY_COL_MM);
  return { tableW, nameColW, totColW, dayColWidths };
}
