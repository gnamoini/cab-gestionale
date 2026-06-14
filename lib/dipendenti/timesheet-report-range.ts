import type { DateRange } from "@/lib/report/date-ranges";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import {
  dateYmdFromDate,
  formatMonthLabel,
  monthDateRange,
  monthKeyFromDate,
} from "@/lib/dipendenti/timesheet-month";

function formatReportDayIt(d: Date): string {
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

/** Intervallo coincide con un mese solare completo (come vista mensile Dipendenti). */
export function isFullCalendarMonthRange(range: DateRange): boolean {
  const startKey = monthKeyFromDate(range.start);
  const endKey = monthKeyFromDate(range.end);
  if (startKey !== endKey) return false;
  const { from, to } = monthDateRange(startKey);
  return dateYmdFromDate(range.start) === from && dateYmdFromDate(range.end) === to;
}

/** Etichetta periodo per KPI timesheet nel Report — allineata all'intervallo query effettivo. */
export function reportTimesheetPeriodLabel(range: DateRange): string {
  if (isFullCalendarMonthRange(range)) {
    return formatMonthLabel(monthKeyFromDate(range.end));
  }

  const startKey = monthKeyFromDate(range.start);
  const endKey = monthKeyFromDate(range.end);
  const startYmd = dateYmdFromDate(range.start);
  const endYmd = dateYmdFromDate(range.end);

  if (startYmd === endYmd) {
    return formatReportDayIt(range.start);
  }

  if (startKey === endKey) {
    return `${formatReportDayIt(range.start)} – ${formatReportDayIt(range.end)}`;
  }

  return `${startYmd} – ${endYmd}`;
}

export type ReportTimesheetRangeMeta = {
  from: string;
  to: string;
  periodLabel: string;
  /** Mese solare completo — abilita confronto vs mese precedente (come Dipendenti). */
  showMonthDelta: boolean;
  monthKey: TimesheetMonthKey | null;
};

/** Range query e metadati per KPI timesheet Report (stessa tabella del modulo Dipendenti). */
export function resolveReportTimesheetRange(filterRange: DateRange): ReportTimesheetRangeMeta {
  const from = dateYmdFromDate(filterRange.start);
  const to = dateYmdFromDate(filterRange.end);
  const fullMonth = isFullCalendarMonthRange(filterRange);
  const monthKey = fullMonth ? monthKeyFromDate(filterRange.end) : null;

  return {
    from,
    to,
    periodLabel: reportTimesheetPeriodLabel(filterRange),
    showMonthDelta: fullMonth,
    monthKey,
  };
}
