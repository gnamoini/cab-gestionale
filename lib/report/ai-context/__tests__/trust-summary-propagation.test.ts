import assert from "node:assert/strict";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import type { InsightEvaluationResult } from "@/lib/report/insights/types";

const emptyTelemetry: InsightTelemetrySummary = {
  totalRules: 25,
  evaluatedRules: 2,
  firedRules: 2,
  skippedRules: 0,
  insightFireRate: 1,
  insightSkipRate: 0,
  skipByReason: { deferred: 0, missing_data: 0, trust_blocked: 0, condition_false: 0 },
  trustDistribution: { GREEN: 1, AMBER: 1, RED: 0 },
  topInsightRules: [],
};

const results: InsightEvaluationResult[] = [
  {
    status: "fired",
    candidate: {
      ruleKey: "A",
      ruleVersion: 1,
      severity: "info",
      priority: 5,
      metricIds: ["lav-aperti"],
      trust: "GREEN",
      payload: {},
    },
  },
  {
    status: "fired",
    candidate: {
      ruleKey: "B",
      ruleVersion: 1,
      severity: "warning",
      priority: 10,
      metricIds: ["lav-aperti"],
      trust: "AMBER",
      payload: {},
    },
  },
];

const mixed = buildReportAIContextDto({ evaluationResults: results, telemetry: emptyTelemetry });
assert.equal(mixed.trustSummary, "AMBER");

const redResults: InsightEvaluationResult[] = [
  {
    status: "fired",
    candidate: {
      ruleKey: "C",
      ruleVersion: 1,
      severity: "critical",
      priority: 20,
      metricIds: ["lav-aperti"],
      trust: "RED",
      payload: {},
    },
  },
];

const redCtx = buildReportAIContextDto({ evaluationResults: redResults, telemetry: emptyTelemetry });
assert.equal(redCtx.trustSummary, "RED");
assert.equal(redCtx.insights[0]!.trust, "RED");

console.log("trust-summary-propagation.test.ts OK");
