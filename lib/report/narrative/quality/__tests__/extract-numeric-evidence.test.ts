import assert from "node:assert/strict";
import { extractNumericEvidence } from "@/lib/report/narrative/quality/extract-numeric-evidence";
import type { AIInsightPayload } from "@/lib/report/ai-context/types";

const payload: AIInsightPayload = {
  schemaVersion: 1,
  values: {
    machineId: 1234,
    year: 2026,
    stock_days: 27,
    percentage: "12%",
    revenue: "1.250,50",
  },
};

const evidence = extractNumericEvidence(payload);

assert.ok(evidence.values.includes(27), "stock_days included");
assert.ok(evidence.values.includes(12), "percentage string included");
assert.ok(evidence.values.includes(1250.5), "revenue string included");
assert.equal(evidence.values.includes(1234), false, "machineId excluded");
assert.equal(evidence.values.includes(2026), false, "year excluded");

console.log("extract-numeric-evidence.test.ts OK");
