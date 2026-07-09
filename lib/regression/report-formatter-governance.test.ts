import assert from "node:assert/strict";
import { REPORT_METRIC_REGISTRY } from "@/lib/report/metrics/report-metric-registry";

for (const entry of REPORT_METRIC_REGISTRY) {
  if (entry.status !== "active") continue;
  assert.ok(entry.formatter, `${entry.id}: formatter obbligatorio per active`);
}

console.log("report-formatter-governance.test.ts OK");
