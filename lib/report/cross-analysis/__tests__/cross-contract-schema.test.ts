import assert from "node:assert/strict";
import {
  CROSS_CONTRACT_VERSION,
  CROSS_NUMERIC_PRECISION,
  type CrossMetricDto,
  type ReportCrossDto,
} from "@/lib/report/cross-analysis/types";

function assertNoContractVersionOnMetric(metric: CrossMetricDto): void {
  assert.equal("contractVersion" in metric, false);
}

const sampleMetric: CrossMetricDto = {
  metricId: "cross_efficiency",
  displayKey: "report.cross.efficiency",
  value: 0.25,
  formattedValue: "0,25",
  trust: "GREEN",
  sourceDatasets: ["lavorazioni", "ore"],
};

assertNoContractVersionOnMetric(sampleMetric);

const samplePayload: ReportCrossDto = {
  contractVersion: CROSS_CONTRACT_VERSION,
  metrics: [sampleMetric],
  metadata: {
    contractVersion: "2.0",
    generatedAt: new Date().toISOString(),
    trustStatus: "GREEN",
    sourceFreshness: "LIVE",
  },
};

assert.equal(samplePayload.contractVersion, "1");
assert.equal(CROSS_NUMERIC_PRECISION, 6);

console.log("cross-contract-schema.test.ts OK");
