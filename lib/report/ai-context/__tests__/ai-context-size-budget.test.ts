import assert from "node:assert/strict";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import {
  AI_CONTEXT_MAX_INSIGHTS,
  AI_CONTEXT_MAX_PAYLOAD_BYTES,
} from "@/lib/report/ai-context/types";
import type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import type { InsightEvaluationResult } from "@/lib/report/insights/types";

const emptyTelemetry: InsightTelemetrySummary = {
  totalRules: 25,
  evaluatedRules: 15,
  firedRules: 15,
  skippedRules: 0,
  insightFireRate: 1,
  insightSkipRate: 0,
  skipByReason: { deferred: 0, missing_data: 0, trust_blocked: 0, condition_false: 0 },
  trustDistribution: { GREEN: 15, AMBER: 0, RED: 0 },
  topInsightRules: [],
};

const manyFired: InsightEvaluationResult[] = Array.from({ length: 15 }, (_, i) => ({
  status: "fired" as const,
  candidate: {
    ruleKey: `RULE_${String(i).padStart(2, "0")}`,
    ruleVersion: 1,
    severity: "info" as const,
    priority: i,
    metricIds: ["lav-aperti"] as const,
    trust: "GREEN" as const,
    payload: { n: i },
  },
}));

const capped = buildReportAIContextDto({ evaluationResults: manyFired, telemetry: emptyTelemetry });
assert.ok(capped.insights.length <= AI_CONTEXT_MAX_INSIGHTS);

const bytes = Buffer.byteLength(JSON.stringify(capped), "utf8");
assert.ok(bytes <= AI_CONTEXT_MAX_PAYLOAD_BYTES, `payload ${bytes} exceeds budget`);

const hugePayload: InsightEvaluationResult[] = [
  {
    status: "fired",
    candidate: {
      ruleKey: "HUGE",
      ruleVersion: 1,
      severity: "info",
      priority: 1,
      metricIds: ["lav-aperti"],
      trust: "GREEN",
      payload: { blob: "x".repeat(20_000) },
    },
  },
];

const degraded = buildReportAIContextDto({ evaluationResults: hugePayload, telemetry: emptyTelemetry });
assert.equal(degraded.insights.length, 0);
assert.ok(Buffer.byteLength(JSON.stringify(degraded), "utf8") <= AI_CONTEXT_MAX_PAYLOAD_BYTES);

console.log("ai-context-size-budget.test.ts OK");
