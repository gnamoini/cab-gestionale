import assert from "node:assert/strict";
import {
  compareRangeFor,
  inclusiveDayCount,
  resolvePresetRange,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
import { REPORT_PERIOD_PRESETS, isReportPeriodPreset } from "@/lib/report/report-period-presets";

const ANCHOR = new Date(2026, 5, 5, 15, 0, 0, 0); // 5 giu 2026

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function assertRange(
  preset: ReportPeriodPreset,
  startYmd: string,
  endYmd: string,
  customFrom?: string,
  customTo?: string,
): void {
  const r = resolvePresetRange(ANCHOR, preset, customFrom, customTo);
  assert.equal(ymd(r.start), startYmd, `${preset} start`);
  assert.equal(ymd(r.end), endYmd, `${preset} end`);
}

assertRange("today", "2026-06-05", "2026-06-05");
assertRange("yesterday", "2026-06-04", "2026-06-04");
assertRange("last_7_days", "2026-05-30", "2026-06-05");
assertRange("last_30_days", "2026-05-07", "2026-06-05");
assertRange("current_week", "2026-06-01", "2026-06-05"); // lun 1 giu
assertRange("last_week", "2026-05-25", "2026-05-31"); // lun 25 mag – dom 31 mag
assertRange("current_month", "2026-06-01", "2026-06-05");
assertRange("last_month", "2026-05-01", "2026-05-31");
assertRange("last_3_months", "2026-04-01", "2026-06-05");
assertRange("last_6_months", "2026-01-01", "2026-06-05");
assertRange("current_quarter", "2026-04-01", "2026-06-05"); // Q2
assertRange("last_quarter", "2026-01-01", "2026-03-31"); // Q1
assertRange("last_12_months", "2025-07-01", "2026-06-05");
assertRange("ytd", "2026-01-01", "2026-06-05");
assertRange("previous_year", "2025-01-01", "2025-12-31");
assertRange("last_3_years", "2023-07-01", "2026-06-05");

// yesterday at month start
const anchorMonthStart = new Date(2026, 5, 1, 10, 0, 0, 0);
const yRange = resolvePresetRange(anchorMonthStart, "yesterday");
assert.equal(ymd(yRange.start), "2026-05-31");
assert.equal(ymd(yRange.end), "2026-05-31");

// last_week crossing year
const anchorJan = new Date(2026, 0, 3, 12, 0, 0, 0); // sab 3 gen 2026
const lw = resolvePresetRange(anchorJan, "last_week");
assert.equal(ymd(lw.start), "2025-12-22");
assert.equal(ymd(lw.end), "2025-12-28");

// last_quarter from Q1 anchor
const anchorFeb = new Date(2026, 1, 15, 12, 0, 0, 0);
const lq = resolvePresetRange(anchorFeb, "last_quarter");
assert.equal(ymd(lq.start), "2025-10-01");
assert.equal(ymd(lq.end), "2025-12-31");

// custom range
assertRange("custom", "2026-01-10", "2026-02-20", "2026-01-10", "2026-02-20");

// custom swapped dates
const swapped = resolvePresetRange(ANCHOR, "custom", "2026-06-10", "2026-06-01");
assert.equal(ymd(swapped.start), "2026-06-01");
assert.equal(ymd(swapped.end), "2026-06-10");

// compare ranges
const cur = resolvePresetRange(ANCHOR, "last_7_days");
const prevPeriod = compareRangeFor(cur, "prev_period");
assert.ok(prevPeriod);
assert.equal(inclusiveDayCount(cur), inclusiveDayCount(prevPeriod!));

const prevYear = compareRangeFor(cur, "prev_year");
assert.ok(prevYear);
assert.equal(ymd(prevYear!.start), "2025-05-30");
assert.equal(ymd(prevYear!.end), "2025-06-05");

assert.equal(compareRangeFor(cur, "none"), null);

// catalog covers every preset id
for (const p of REPORT_PERIOD_PRESETS) {
  assert.ok(isReportPeriodPreset(p.id));
  resolvePresetRange(ANCHOR, p.id);
}

assert.equal(inclusiveDayCount(resolvePresetRange(ANCHOR, "today")), 1);
assert.equal(inclusiveDayCount(resolvePresetRange(ANCHOR, "last_7_days")), 7);

console.log("date-ranges.test.ts OK");
