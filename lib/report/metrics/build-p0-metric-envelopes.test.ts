import assert from "node:assert/strict";
import { buildP0MetricEnvelopes } from "@/lib/report/metrics/build-p0-metric-envelopes";
import type { KpiCardModel } from "@/lib/report/build-report-model";
import type { DateRange } from "@/lib/report/date-ranges";

const period: DateRange = {
  start: new Date("2026-06-01"),
  end: new Date("2026-06-30T23:59:59.999"),
};

const kpis: KpiCardModel[] = [
  {
    id: "lav-periodo",
    label: "Lavorazioni periodo",
    value: "42",
    compareRows: null,
  },
  {
    id: "mezzi",
    label: "Mezzi",
    value: "10",
    compareRows: null,
  },
];

const envelopes = buildP0MetricEnvelopes(kpis, period, "prev_period");
assert.equal(envelopes.length, 2);
assert.equal(envelopes[0]!.metricId, "lav-periodo");
assert.equal(envelopes[0]!.semantics, "flow");
assert.equal(envelopes[0]!.period.from, "2026-06-01");
assert.equal(envelopes[1]!.metricId, "mezzi");
assert.equal(envelopes[1]!.semantics, "snapshot");
assert.equal(envelopes[1]!.metric.compare?.status, "unavailable");

console.log("build-p0-metric-envelopes.test.ts OK");
