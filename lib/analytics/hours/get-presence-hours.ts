import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { AnalyticsHoursResult } from "@/lib/analytics/hours/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getPresenceHours(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
): AnalyticsHoursResult {
  let hours = 0;
  for (const entry of entries) {
    if (!isoInRange(entry.work_date, range)) continue;
    const cell = entryToCellValue(entry);
    hours += cell.oreOrdinarie + cell.oreStraordinarie;
  }
  return {
    hours: round2(hours),
    kind: "presence",
    source: "dipendenti_timesheet_entries",
    confidence: "high",
    consistency: "ok",
  };
}
