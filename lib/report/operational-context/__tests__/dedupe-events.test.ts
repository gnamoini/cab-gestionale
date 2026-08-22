import assert from "node:assert/strict";
import { dedupeOperationalEvents } from "@/lib/report/operational-context/dedupe-operational-events";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

const base: ReportOperationalEvent = {
  id: "a",
  timestamp: "2026-01-15T10:00:00.000Z",
  type: "diary",
  title: "Nota",
  source: { kind: "diary", sourceId: "d1" },
};

const dup: ReportOperationalEvent = { ...base, id: "b", title: "Dup" };
assert.equal(dedupeOperationalEvents([base, dup]).length, 1);
console.log("dedupe-events.test.ts OK");
