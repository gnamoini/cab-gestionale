import assert from "node:assert/strict";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import { AI_CONTEXT_CONTRACT_VERSION } from "@/lib/report/ai-context/types";
import { buildNarrativePromptContext } from "@/lib/report/narrative/build-narrative-prompt-context";
import { NARRATIVE_PROMPT_CONTEXT_VERSION } from "@/lib/report/narrative/types";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
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

const aiContext = buildReportAIContextDto({ evaluationResults, telemetry });
const promptContext = buildNarrativePromptContext(aiContext);

assert.equal(promptContext.contractVersion, NARRATIVE_PROMPT_CONTEXT_VERSION);
assert.equal(promptContext.sourceContextVersion, AI_CONTEXT_CONTRACT_VERSION);
assert.equal(promptContext.signals.length, aiContext.insights.length);
assert.equal(promptContext.trustSummary, aiContext.trustSummary);

for (let i = 0; i < aiContext.insights.length; i++) {
  const src = aiContext.insights[i]!;
  const dst = promptContext.signals[i]!;
  assert.equal(dst.ruleKey, src.ruleKey);
  assert.equal(dst.ruleVersion, src.ruleVersion);
  assert.equal(dst.severity, src.severity);
  assert.equal(dst.trust, src.trust);
  assert.deepEqual(dst.metricIds, src.metricIds);
  assert.deepEqual(dst.payload, src.payload);
}

console.log("narrative-prompt-context-builder.test.ts OK");
