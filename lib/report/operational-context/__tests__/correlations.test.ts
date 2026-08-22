import assert from "node:assert/strict";
import { buildOperationalCorrelations } from "@/lib/report/operational-context/build-operational-correlations";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import type { InsightDto } from "@/lib/report/insights/types";

const insight: InsightDto = {
  id: "i1",
  ruleKey: "LAV_SPIKE",
  ruleVersion: 1,
  message: "Spike",
  severity: "warning",
  priority: 1,
  metricIds: ["lav-aperti"],
  drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
  trust: "GREEN",
};

const event: ReportOperationalEvent = {
  id: "e1",
  timestamp: "2026-03-01T12:00:00.000Z",
  type: "system",
  title: "Evento",
  metricIds: ["lav-aperti"],
  insightRuleKeys: ["LAV_SPIKE"],
  source: { kind: "deterministic", sourceId: "e1" },
};

const linked = buildOperationalCorrelations({
  insights: [insight],
  events: [event],
  envelopesById: new Map(),
});
assert.ok(linked.length >= 1);
assert.ok(!linked.some((c) => /causa/i.test(c.label)));

const orphanInsight: InsightDto = { ...insight, id: "i2", ruleKey: "ORPHAN", metricIds: ["eco_fatturato"] };
const isolatedEvent: ReportOperationalEvent = {
  ...event,
  id: "e2",
  timestamp: "2025-06-01T12:00:00.000Z",
  metricIds: ["lav-aperti"],
  insightRuleKeys: undefined,
};
const unlinked = buildOperationalCorrelations({
  insights: [orphanInsight],
  events: [isolatedEvent],
  envelopesById: new Map(),
});
assert.equal(unlinked.length, 0);
console.log("correlations.test.ts OK");
