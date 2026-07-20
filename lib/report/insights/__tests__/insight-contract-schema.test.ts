import assert from "node:assert/strict";
import {
  INSIGHT_CONTRACT_VERSION,
  INSIGHT_P0_RULE_COUNT,
  INSIGHT_STRIP_MAX,
  type InsightCandidate,
  type InsightDto,
} from "@/lib/report/insights/types";

const sampleCandidate: InsightCandidate = {
  ruleKey: "LAV_OPEN_BACKLOG",
  ruleVersion: 1,
  severity: "warning",
  priority: 15,
  metricIds: ["lav-aperti"],
  trust: "GREEN",
  payload: { open: 3 },
};

assert.equal("drillDown" in sampleCandidate, false);
assert.equal("message" in sampleCandidate, false);

const sampleDto: InsightDto = {
  id: "LAV_OPEN_BACKLOG",
  ruleKey: "LAV_OPEN_BACKLOG",
  ruleVersion: 1,
  message: "3 lavorazioni in backlog aperte",
  severity: "warning",
  priority: 15,
  metricIds: ["lav-aperti"],
  drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
  trust: "GREEN",
};

assert.equal(sampleDto.ruleKey, "LAV_OPEN_BACKLOG");
assert.equal(sampleDto.ruleVersion, 1);
assert.ok(sampleDto.drillDown);
assert.equal(INSIGHT_CONTRACT_VERSION, "1");
assert.equal(INSIGHT_P0_RULE_COUNT, 26);
assert.equal(INSIGHT_STRIP_MAX, 5);

console.log("insight-contract-schema.test.ts OK");
