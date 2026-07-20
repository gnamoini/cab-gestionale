import assert from "node:assert/strict";
import {
  AI_CONTEXT_CONTRACT_VERSION,
  AI_CONTEXT_MAX_INSIGHTS,
  AI_CONTEXT_MAX_PAYLOAD_BYTES,
  AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
  type AIInsightSignal,
  type ReportAIContextDto,
} from "@/lib/report/ai-context/types";

const sampleSignal: AIInsightSignal = {
  ruleKey: "LAV_OPEN_BACKLOG",
  ruleVersion: 1,
  severity: "warning",
  trust: "GREEN",
  metricIds: ["lav-aperti"],
  payload: {
    schemaVersion: AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
    values: { open: 3 },
  },
};

assert.equal("message" in sampleSignal, false);
assert.equal("drillDown" in sampleSignal, false);
assert.equal(sampleSignal.payload.schemaVersion, 1);

const sampleDto: ReportAIContextDto = {
  contractVersion: AI_CONTEXT_CONTRACT_VERSION,
  insights: [sampleSignal],
  trustSummary: "GREEN",
};

assert.equal(sampleDto.contractVersion, "1");
assert.equal(AI_CONTEXT_MAX_INSIGHTS, 10);
assert.equal(AI_CONTEXT_MAX_PAYLOAD_BYTES, 8192);

console.log("ai-context-contract-schema.test.ts OK");
