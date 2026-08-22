import assert from "node:assert/strict";
import { buildOperationalEventsFromSources } from "@/lib/report/operational-context/build-operational-events-from-sources";
import { buildReportCorrelationsLegacy } from "@/lib/report/operational-context/build-report-correlations-legacy";
import type { InsightDto } from "@/lib/report/insights/types";
import type { OperationalDiaryEntry } from "@/lib/operational-intelligence/types";
import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";

const insights: InsightDto[] = [
  {
    id: "i1",
    ruleKey: "LAV_BACKLOG",
    ruleVersion: 1,
    message: "Backlog",
    severity: "warning",
    priority: 2,
    metricIds: ["lav-aperti"],
    drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
    trust: "GREEN",
  },
];

const diary: OperationalDiaryEntry[] = [
  {
    workDate: "2026-02-01",
    text: "Ritardo fornitore",
    category: "supplier",
    severity: "medium",
    source: "user",
  },
];

const facts: FactEngineOutput = {
  period: {
    id: "p1",
    type: "custom",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    previousPeriodId: null,
    label: "Feb 2026",
    status: "open",
    generatedAt: null,
  },
  metrics: {},
  deltas: {},
};

const { events, correlations } = buildOperationalEventsFromSources({
  insights,
  classifiedDiary: diary,
  facts,
  envelopesById: new Map(),
});

assert.ok(events.length >= 1);
assert.ok(events.some((e) => e.source === "diary" || e.headline.length > 0));

const legacyOnly = buildReportCorrelationsLegacy({ insights, events, envelopesById: new Map() });
assert.deepEqual(correlations, legacyOnly);
console.log("p4-extraction-parity.test.ts OK");
