import assert from "node:assert/strict";
import { attachEventDrillDown } from "@/lib/report/operational-context/resolve-event-drill-down";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

const mezzoEvent: ReportOperationalEvent = {
  id: "m1",
  timestamp: "2026-01-01T00:00:00.000Z",
  type: "system",
  title: "Mezzo offline",
  entity: { type: "mezzo", id: "mezzo-1" },
  source: { kind: "deterministic" },
};

const out = attachEventDrillDown({
  events: [mezzoEvent],
  insightsByRule: new Map(),
  period: { preset: "custom", start: "2026-01-01", end: "2026-01-31", compareMode: "none" },
});
assert.equal(out[0]?.drillDown, undefined);
console.log("drill-down-bridge.test.ts OK");
