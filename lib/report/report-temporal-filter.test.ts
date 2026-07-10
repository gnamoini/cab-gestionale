import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import type { LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";
import {
  applyYearMatrixFilterRange,
  effectiveReportRangeForYear,
  monthInReportRange,
  yearsInReportRange,
} from "@/lib/report/report-temporal-filter";

const q1_2025 = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};

assert.deepEqual(yearsInReportRange(q1_2025), [2025]);
assert.equal(monthInReportRange(2025, 0, q1_2025), true);
assert.equal(monthInReportRange(2025, 5, q1_2025), false);

const effective = effectiveReportRangeForYear(q1_2025, 2025);
assert.equal(effective.start.getMonth(), 0);
assert.equal(effective.end.getMonth(), 2);

const baseRows: LavorazioniYearRow[] = [
  {
    year: 2024,
    months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
    total: 100,
    growthVsPrevPct: null,
    bestMonthIdx: 11,
    worstMonthIdx: 11,
  },
  {
    year: 2025,
    months: [10, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    total: 13,
    growthVsPrevPct: -87,
    bestMonthIdx: 0,
    worstMonthIdx: 1,
  },
];

const filtered = applyYearMatrixFilterRange(baseRows, q1_2025);
assert.equal(filtered.mode, "filtered");
assert.equal(filtered.rows.length, 1);
assert.equal(filtered.rows[0]!.year, 2025);
assert.equal(filtered.rows[0]!.total, 13);
assert.equal(filtered.rows[0]!.months[0], 10);
assert.deepEqual(filtered.manualHistoryYears, []);

const manualKeys = new Set(["2024-01", "2024-06"]);
const withManual = applyYearMatrixFilterRange(baseRows, q1_2025, manualKeys);
assert.deepEqual(withManual.rows.map((r) => r.year), [2024, 2025]);
assert.equal(withManual.rows[0]!.total, 100);
assert.equal(withManual.rows[1]!.total, 13);
assert.deepEqual(withManual.manualHistoryYears, [2024]);

const spanYears = {
  start: startOfLocalDay(new Date(2024, 10, 1)),
  end: endOfLocalDay(new Date(2025, 1, 28)),
};
const spanFiltered = applyYearMatrixFilterRange(baseRows, spanYears);
assert.deepEqual(spanFiltered.rows.map((r) => r.year), [2024, 2025]);
assert.equal(spanFiltered.rows[0]!.total, 100);
assert.equal(spanFiltered.rows[1]!.total, 11);

console.log("report-temporal-filter.test.ts OK");
