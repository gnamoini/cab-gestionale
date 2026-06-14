import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay, type DateRange } from "@/lib/report/date-ranges";
import {
  isFullCalendarMonthRange,
  reportTimesheetPeriodLabel,
  resolveReportTimesheetRange,
} from "@/lib/dipendenti/timesheet-report-range";

function range(start: Date, end: Date): DateRange {
  return { start, end };
}

{
  const today = range(
    startOfLocalDay(new Date(2026, 5, 14)),
    endOfLocalDay(new Date(2026, 5, 14)),
  );
  assert.equal(isFullCalendarMonthRange(today), false);
  assert.equal(reportTimesheetPeriodLabel(today).includes("2026"), true);
  assert.equal(reportTimesheetPeriodLabel(today).toLowerCase().includes("giugno"), false);
  const meta = resolveReportTimesheetRange(today);
  assert.equal(meta.from, "2026-06-14");
  assert.equal(meta.to, "2026-06-14");
  assert.equal(meta.showMonthDelta, false);
}

{
  const partialMonth = range(
    startOfLocalDay(new Date(2026, 5, 1)),
    endOfLocalDay(new Date(2026, 5, 14)),
  );
  assert.equal(isFullCalendarMonthRange(partialMonth), false);
  assert.equal(reportTimesheetPeriodLabel(partialMonth).includes("–"), true);
  const meta = resolveReportTimesheetRange(partialMonth);
  assert.equal(meta.from, "2026-06-01");
  assert.equal(meta.to, "2026-06-14");
  assert.equal(meta.showMonthDelta, false);
}

{
  const fullJune = range(
    startOfLocalDay(new Date(2026, 5, 1)),
    endOfLocalDay(new Date(2026, 5, 30)),
  );
  assert.equal(isFullCalendarMonthRange(fullJune), true);
  assert.equal(reportTimesheetPeriodLabel(fullJune).toLowerCase(), "giugno 2026");
  const meta = resolveReportTimesheetRange(fullJune);
  assert.equal(meta.showMonthDelta, true);
  assert.equal(meta.monthKey, "2026-06");
}

console.log("timesheet-report-range.test.ts OK");
