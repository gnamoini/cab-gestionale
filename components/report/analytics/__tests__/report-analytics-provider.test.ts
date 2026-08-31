import assert from "node:assert/strict";
import { registrationsEqual } from "@/components/report/analytics/report-analytics-provider";

assert.equal(
  registrationsEqual(
    { metricIds: ["mag_orders"], includeSeries: false },
    { metricIds: ["mag_orders"], includeSeries: false },
  ),
  true,
);

assert.equal(
  registrationsEqual(
    { metricIds: ["a"], includeSeries: true, granularity: "month" },
    { metricIds: ["a"], includeSeries: true, granularity: "month", dimensions: [] },
  ),
  true,
);

assert.equal(
  registrationsEqual({ metricIds: ["a"] }, { metricIds: ["b"] }),
  false,
);

console.log("report-analytics-provider.test.ts OK");
