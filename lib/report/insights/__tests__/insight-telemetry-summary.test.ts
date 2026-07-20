import assert from "node:assert/strict";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import type { InsightEvaluationResult } from "@/lib/report/insights/types";

const results: InsightEvaluationResult[] = [
  {
    status: "fired",
    candidate: {
      ruleKey: "LAV_OPEN_BACKLOG",
      ruleVersion: 1,
      severity: "warning",
      priority: 15,
      metricIds: ["lav-aperti"],
      trust: "GREEN",
      payload: { open: 3 },
    },
  },
  {
    status: "fired",
    candidate: {
      ruleKey: "ECO_INVOICES_PENDING",
      ruleVersion: 1,
      severity: "warning",
      priority: 22,
      metricIds: ["eco_fatturato"],
      trust: "AMBER",
      payload: {},
    },
  },
  { status: "skipped", ruleKey: "LAV_SLA_BREACH", ruleVersion: 1, reason: "condition_false" },
  { status: "skipped", ruleKey: "LAV_MANUAL_OVERRIDE", ruleVersion: 1, reason: "deferred" },
];

const summary = buildInsightTelemetrySummary({
  evaluationResults: results,
  insights: [
    {
      id: "LAV_OPEN_BACKLOG",
      ruleKey: "LAV_OPEN_BACKLOG",
      ruleVersion: 1,
      message: "x",
      severity: "warning",
      priority: 15,
      metricIds: ["lav-aperti"],
      drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
      trust: "GREEN",
    },
  ],
  totalRules: 25,
});

assert.equal(summary.totalRules, 25);
assert.equal(summary.evaluatedRules, 4);
assert.equal(summary.firedRules, 2);
assert.equal(summary.skippedRules, 2);
assert.equal(summary.insightFireRate, 0.5);
assert.equal(summary.insightSkipRate, 0.5);
assert.equal(summary.skipByReason.deferred, 1);
assert.equal(summary.skipByReason.condition_false, 1);
assert.equal(summary.trustDistribution.GREEN, 1);
assert.equal(summary.trustDistribution.AMBER, 1);
assert.equal(summary.topInsightRules[0]!.ruleKey, "LAV_OPEN_BACKLOG");
assert.equal(summary.topInsightRules[0]!.ruleVersion, 1);

console.log("insight-telemetry-summary.test.ts OK");
