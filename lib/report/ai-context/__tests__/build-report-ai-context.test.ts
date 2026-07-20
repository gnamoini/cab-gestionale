import assert from "node:assert/strict";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { AI_CONTEXT_CONTRACT_VERSION } from "@/lib/report/ai-context/types";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";

const bundle = insightFixtureBundle();
const cross = insightFixtureCross();
const { evaluationResults } = buildReportInsightsDto({ bundle, cross });
const telemetry = buildInsightTelemetrySummary({
  evaluationResults,
  insights: [],
  totalRules: 25,
});

const ctx = buildReportAIContextDto({ evaluationResults, telemetry });
assert.equal(ctx.contractVersion, AI_CONTEXT_CONTRACT_VERSION);
assert.ok(ctx.insights.length > 0);
assert.ok(ctx.insights.every((i) => i.payload.schemaVersion === 1));
assert.ok(ctx.insights.every((i) => i.ruleKey.length > 0));
assert.equal(ctx.trustSummary, "GREEN");

console.log("build-report-ai-context.test.ts OK");
