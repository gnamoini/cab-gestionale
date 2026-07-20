import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";

const FORBIDDEN_KEYS = ["message", "drillDown", "formattedValue", "displayLabel", "uiSection"];

function collectKeys(obj: unknown, keys = new Set<string>()): Set<string> {
  if (obj === null || typeof obj !== "object") return keys;
  if (Array.isArray(obj)) {
    for (const item of obj) collectKeys(item, keys);
    return keys;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    keys.add(k);
    collectKeys(v, keys);
  }
  return keys;
}

const bundle = insightFixtureBundle();
const cross = insightFixtureCross();
const { evaluationResults } = buildReportInsightsDto({ bundle, cross });
const telemetry = buildInsightTelemetrySummary({
  evaluationResults,
  insights: [],
  totalRules: 25,
});

const ctx = buildReportAIContextDto({ evaluationResults, telemetry });
const keys = collectKeys(ctx);

for (const forbidden of FORBIDDEN_KEYS) {
  assert.equal(keys.has(forbidden), false, `presentation key leaked: ${forbidden}`);
}

const builderSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/ai-context/build-report-ai-context.ts"),
  "utf8",
);
assert.doesNotMatch(builderSrc, /insights:\s*InsightDto/);
assert.doesNotMatch(builderSrc, /InsightDto\[\]/);

console.log("ai-context-no-presentation-leak.test.ts OK");
