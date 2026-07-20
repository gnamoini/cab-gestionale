import assert from "node:assert/strict";
import { buildOperationalBriefScore } from "@/lib/operational-intelligence/score/build-operational-brief-score";
import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";
import { INSIGHT_CONTRACT_VERSION } from "@/lib/report/insights/types";

const baseFacts: FactEngineOutput = {
  period: {
    id: "weekly:2026-07-14",
    type: "weekly",
    startDate: "2026-07-14",
    endDate: "2026-07-20",
    previousPeriodId: null,
    label: "Settimana 29",
    status: "open",
    generatedAt: null,
  },
  metrics: { lav_late_sla: 2, lav_open: 8, mag_low_stock: 3 },
  deltas: {},
};

const emptyInsights = {
  contractVersion: INSIGHT_CONTRACT_VERSION,
  insights: [],
  metadata: {} as never,
};

const score = buildOperationalBriefScore(baseFacts, emptyInsights);
assert.ok(score.overall > 0);
assert.ok(score.reasons.length > 0);
assert.ok(["green", "amber", "red"].includes(score.status));
