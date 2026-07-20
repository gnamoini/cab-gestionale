import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { trustFilterFiredCandidates } from "@/lib/report/insights/engine/trust-filter";
import { scoreInsightCandidates } from "@/lib/report/insights/engine/calculate-insight-score";
import { rankInsights } from "@/lib/report/insights/engine/rank-insights";
import { renderInsightMessage } from "@/lib/report/insights/engine/render-insight-message";
import { buildInsightRuleContext } from "@/lib/report/insights/insight-input";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";
import { INSIGHT_CONTRACT_VERSION, INSIGHT_STRIP_MAX } from "@/lib/report/insights/types";

function p95(durations: number[]): number {
  const sorted = [...durations].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1]!;
}

const registryDurations: number[] = [];
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  assert.ok(INSIGHT_RULE_REGISTRY.length > 0);
  registryDurations.push(performance.now() - t0);
}
assert.ok(p95(registryDurations) < 5, "registry load p95 >= 5ms");

const bundle = insightFixtureBundle();
const cross = insightFixtureCross();
const ctx = buildInsightRuleContext({ bundle, cross });

const evalDurations: number[] = [];
let lastResults = evaluateInsightRules(ctx);
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  lastResults = evaluateInsightRules(ctx);
  evalDurations.push(performance.now() - t0);
}
assert.ok(p95(evalDurations) < 50, `evaluateInsightRules p95 ${p95(evalDurations).toFixed(2)}ms`);

const trustDurations: number[] = [];
let candidates = trustFilterFiredCandidates(lastResults);
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  candidates = trustFilterFiredCandidates(lastResults);
  trustDurations.push(performance.now() - t0);
}
assert.ok(p95(trustDurations) < 5, `trustFilter p95 ${p95(trustDurations).toFixed(2)}ms`);

const rankDurations: number[] = [];
const scored = scoreInsightCandidates(candidates);
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  rankInsights(scored);
  rankDurations.push(performance.now() - t0);
}
assert.ok(p95(rankDurations) < 5, `rankInsights p95 ${p95(rankDurations).toFixed(2)}ms`);

const renderDurations: number[] = [];
const fired = lastResults.filter((r) => r.status === "fired").map((r) => r.candidate);
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  for (const c of fired) renderInsightMessage(c);
  renderDurations.push(performance.now() - t0);
}
assert.ok(p95(renderDurations) < 10, `renderInsightMessage p95 ${p95(renderDurations).toFixed(2)}ms`);

const buildDurations: number[] = [];
let lastBuild = buildReportInsightsDto({ bundle, cross });
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  lastBuild = buildReportInsightsDto({ bundle, cross });
  buildDurations.push(performance.now() - t0);
}
assert.ok(p95(buildDurations) < 75, `buildReportInsightsDto p95 ${p95(buildDurations).toFixed(2)}ms`);

assert.ok(lastBuild.dto.insights.length <= INSIGHT_STRIP_MAX);

const payload = {
  metadata: lastBuild.dto.metadata,
  data: {
    contractVersion: INSIGHT_CONTRACT_VERSION,
    insights: lastBuild.dto.insights,
  },
};
const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
assert.ok(payloadBytes < 15 * 1024, `payload size ${payloadBytes} >= 15KB`);

console.log("report-insights-performance.test.ts OK");
