import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import { buildNarrativePromptContext } from "@/lib/report/narrative/build-narrative-prompt-context";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";

const FORBIDDEN_KEYS = new Set([
  "message",
  "drillDown",
  "interpretation",
  "formattedValue",
  "displayLabel",
  "uiSection",
  "summary",
  "recommendation",
  "derivedKpi",
  "derivedKpis",
]);

function collectKeys(value: unknown, keys: Set<string>): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
}

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

const keys = new Set<string>();
collectKeys(promptContext, keys);
for (const forbidden of FORBIDDEN_KEYS) {
  assert.equal(keys.has(forbidden), false, `forbidden enrichment key: ${forbidden}`);
}

for (const signal of promptContext.signals) {
  assert.equal("message" in signal, false);
  assert.equal("interpretation" in signal, false);
  assert.equal("summary" in signal, false);
  assert.equal("recommendation" in signal, false);
}

const builderSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/build-narrative-prompt-context.ts"),
  "utf8",
);
for (const forbidden of ["interpretation", "summary", "recommendation", "message"]) {
  assert.doesNotMatch(builderSrc, new RegExp(forbidden), `builder must not reference ${forbidden}`);
}

console.log("narrative-prompt-context-no-enrichment.test.ts OK");
