import assert from "node:assert/strict";
import { calculateInsightScore, SEVERITY_SCORE } from "@/lib/report/insights/engine/calculate-insight-score";
import { rankInsights } from "@/lib/report/insights/engine/rank-insights";
import type { InsightCandidate, ScoredInsightCandidate } from "@/lib/report/insights/types";

const critical: InsightCandidate = {
  ruleKey: "A",
  ruleVersion: 1,
  severity: "critical",
  priority: 10,
  metricIds: ["lav-aperti"],
  trust: "GREEN",
  payload: {},
};

const warningHigh: InsightCandidate = {
  ruleKey: "B",
  ruleVersion: 1,
  severity: "warning",
  priority: 50,
  metricIds: ["lav-aperti"],
  trust: "GREEN",
  payload: {},
};

const info: InsightCandidate = {
  ruleKey: "C",
  ruleVersion: 1,
  severity: "info",
  priority: 99,
  metricIds: ["lav-aperti"],
  trust: "GREEN",
  payload: {},
};

assert.equal(calculateInsightScore(critical), SEVERITY_SCORE.critical + 10);
assert.equal(calculateInsightScore(warningHigh), SEVERITY_SCORE.warning + 50);
assert.equal(calculateInsightScore(info), SEVERITY_SCORE.info + 99);

assert.ok(calculateInsightScore(critical) > calculateInsightScore(warningHigh));
assert.ok(calculateInsightScore(warningHigh) > calculateInsightScore(info));

const scored: ScoredInsightCandidate[] = [
  { ...info, score: calculateInsightScore(info) },
  { ...warningHigh, score: calculateInsightScore(warningHigh) },
  { ...critical, score: calculateInsightScore(critical) },
];

const ranked = rankInsights(scored);
assert.deepEqual(
  ranked.map((r) => r.ruleKey),
  ["A", "B", "C"],
);

console.log("insight-ranking-score.test.ts OK");
