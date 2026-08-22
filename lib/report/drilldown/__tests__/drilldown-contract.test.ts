import assert from "node:assert/strict";
import { getDrilldownMetricEntry, isDrilldownSupported } from "@/lib/report/drilldown/drilldown-metric-registry";
import { paginateSlice } from "@/lib/report/drilldown/paginate-slice.server";
import { drillDownRefToContext } from "@/lib/report/drilldown/drill-down-ref-bridge";

const period = {
  preset: "custom" as const,
  start: "2026-01-01",
  end: "2026-01-31",
  compareMode: "none" as const,
};

const lav = getDrilldownMetricEntry("lav-chiusi");
assert.ok(lav);
assert.equal(lav.parityApplicable, true);
assert.equal(lav.aggregationKind, "count");

const eco = getDrilldownMetricEntry("eco_fatturato");
assert.ok(eco);
assert.equal(eco.parityApplicable, false);
assert.equal(eco.aggregationKind, "sum");

assert.equal(isDrilldownSupported("quote_conversion_pct"), false);

const page = paginateSlice([1, 2, 3, 4, 5], null, 2);
assert.equal(page.rows.length, 2);
assert.equal(page.pageInfo.totalEstimate, 5);
assert.equal(page.pageInfo.hasNextPage, true);

const ctx = drillDownRefToContext(
  { metricId: "lav-aperti", targetSection: "lavorazioni", targetTab: "backlog" },
  period,
  "none",
  "insight",
);
assert.equal(ctx.metricId, "lav-aperti");
assert.equal(ctx.filters?.targetTab, "backlog");

console.log("drilldown-contract.test.ts OK");
