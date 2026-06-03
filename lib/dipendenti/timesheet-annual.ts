import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { formatMonthLabel, monthKeyFromParts } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEntryRow, TimesheetMonthTotals } from "@/lib/dipendenti/types";

export type AnnualMonthRow = TimesheetMonthTotals & {
  monthKey: string;
  monthLabel: string;
  month: number;
};

export function computeAnnualMonthlyBreakdown(
  entries: readonly DipendenteTimesheetEntryRow[],
  employeeId: string,
  year: number,
): AnnualMonthRow[] {
  const empEntries = entries.filter((e) => e.dipendente_id === employeeId);
  const rows: AnnualMonthRow[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthKey = monthKeyFromParts(year, month);
    const monthEntries = empEntries.filter((e) => e.work_date.startsWith(`${monthKey}-`));
    const totals = computeMonthTotals(monthEntries);
    rows.push({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      month,
      ...totals,
    });
  }

  return rows;
}
