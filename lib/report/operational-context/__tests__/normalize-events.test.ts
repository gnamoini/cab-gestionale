import assert from "node:assert/strict";
import { normalizeOperationalEvents } from "@/lib/report/operational-context/normalize-operational-events";
import type { InsightDto } from "@/lib/report/insights/types";

const insights: InsightDto[] = [
  {
    id: "i1",
    ruleKey: "TEST",
    ruleVersion: 1,
    message: "Msg",
    severity: "info",
    priority: 1,
    metricIds: ["lav-aperti"],
    drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
    trust: "GREEN",
  },
];

const rows = normalizeOperationalEvents({
  insights,
  classifiedDiary: [
    {
      workDate: "2026-03-10",
      text: "Nota",
      category: "issue",
      severity: "low",
      source: "user",
    },
  ],
  businessEvents: [],
  periodEndYmd: "2026-03-31",
});
assert.equal(rows.length, 2);
assert.ok(rows.some((r) => r.type === "diary"));
console.log("normalize-events.test.ts OK");
