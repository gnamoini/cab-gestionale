import assert from "node:assert/strict";
import {
  buildMonthDays,
  canShiftWeekAnchorInMonth,
  filterMonthDaysByWeek,
  resolveWeekAnchorForMonth,
  shiftWeekAnchor,
} from "@/lib/dipendenti/timesheet-month";

// Marzo 2026: 1° = domenica → prima settimana nel mese = solo dom 1
const mar2026 = buildMonthDays("2026-03");

assert.deepEqual(
  filterMonthDaysByWeek(mar2026, "2026-03-01").map((d) => d.dateYmd),
  ["2026-03-01"],
  "first week of March 2026 intersects only Sunday 1st",
);

const midMarch = filterMonthDaysByWeek(mar2026, "2026-03-10");
assert.equal(midMarch.length, 7, "mid-month week has 7 days in month");
assert.equal(midMarch[0]?.dateYmd, "2026-03-09");
assert.equal(midMarch[6]?.dateYmd, "2026-03-15");

assert.equal(canShiftWeekAnchorInMonth("2026-03", "2026-03-01", -1), false);
assert.equal(canShiftWeekAnchorInMonth("2026-03", "2026-03-01", 1), true);
assert.equal(canShiftWeekAnchorInMonth("2026-03", "2026-03-24", 1), true);
assert.equal(canShiftWeekAnchorInMonth("2026-03", "2026-03-30", 1), false);

assert.equal(resolveWeekAnchorForMonth("2026-03", new Date(2026, 2, 15)), "2026-03-15");
assert.equal(resolveWeekAnchorForMonth("2026-01", new Date(2026, 2, 15)), "2026-01-01");

const anchor = "2026-03-10";
assert.equal(shiftWeekAnchor(anchor, 1), "2026-03-17");

console.log("timesheet-month-week.test.ts OK");
