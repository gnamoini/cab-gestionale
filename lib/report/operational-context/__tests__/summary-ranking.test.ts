import assert from "node:assert/strict";
import { rankSummaryOperationalEvents } from "@/lib/report/operational-context/rank-summary-events";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

const recentDiary: ReportOperationalEvent = {
  id: "diary-1",
  timestamp: new Date().toISOString(),
  type: "diary",
  title: "Nota recente",
  severity: "neutral",
  source: { kind: "diary" },
};

const critical: ReportOperationalEvent = {
  id: "insight-1",
  timestamp: "2020-01-01T00:00:00.000Z",
  type: "insight",
  title: "Anomalia economica",
  severity: "negative",
  metricIds: ["eco_fatturato", "eco_margine"],
  insightRuleKeys: ["ECO_DROP"],
  source: { kind: "deterministic", sourceId: "ECO_DROP" },
};

const dupRule: ReportOperationalEvent = {
  ...critical,
  id: "insight-dup",
  source: { kind: "system", sourceId: "uuid-1" },
};

const rankedDedup = rankSummaryOperationalEvents([critical, dupRule], [], 3);
assert.equal(rankedDedup.length, 1);

const ranked = rankSummaryOperationalEvents([recentDiary, critical], [], 1);
assert.equal(ranked[0]?.id, critical.id);
console.log("summary-ranking.test.ts OK");
