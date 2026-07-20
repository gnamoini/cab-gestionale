import assert from "node:assert/strict";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";

const anchor = new Date("2026-07-20T12:00:00");

const withAvgCompare = resolveDatasetDateRanges({
  anchor,
  period: {
    preset: "last_30_days" as never,
    start: "2026-06-21",
    end: "2026-07-20",
    compareMode: "avg_3_months" as never,
  },
});

assert.ok(withAvgCompare.range.start instanceof Date);
assert.ok(withAvgCompare.range.end instanceof Date);
assert.ok(withAvgCompare.compareRange, "avg_3_months must resolve a compare range");
assert.ok(withAvgCompare.compareRange!.end.getTime() < withAvgCompare.range.start.getTime());

const withBounds = resolveDatasetDateRanges({
  anchor,
  period: {
    preset: "custom",
    start: "2026-06-21",
    end: "2026-07-20",
    compareMode: "none",
  },
});

assert.equal(withBounds.range.start.toISOString().slice(0, 10), "2026-06-20");
assert.equal(withBounds.compareRange, null);

console.log("report-datasets-period.test.ts OK");
