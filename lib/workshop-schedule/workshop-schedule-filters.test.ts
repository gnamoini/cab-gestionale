import assert from "node:assert/strict";
import { countActiveFilters, filterSessions } from "@/lib/workshop-schedule/workshop-schedule-filters";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

const baseSession = {
  id: "s1",
  title: "Test",
  description: null,
  eventType: "intervento_programmato" as const,
  blockType: null,
  startAt: "2026-07-03T08:00:00.000Z",
  endAt: "2026-07-03T09:00:00.000Z",
  planningStatus: "scheduled" as const,
  priority: null,
  workOrderId: null,
  revision: 1,
  createdBy: "u1",
  createdAt: "",
  updatedAt: "",
  deletedAt: null,
  seriesId: null,
  recurrenceFrequency: null,
  recurrenceInterval: null,
  recurrenceUntil: null,
  legacyPromemoriaId: null,
  workOrder: null,
} satisfies WorkshopScheduleSessionView;

assert.equal(countActiveFilters({}), 0);
assert.equal(countActiveFilters({ workOrderId: "wo-1" }), 1);
assert.equal(countActiveFilters({ priorities: ["media"] }), 1);

const filtered = filterSessions([baseSession], { priorities: ["media"] });
assert.equal(filtered.length, 0, "null priority must not match media filter");

const withPriority = filterSessions([{ ...baseSession, priority: "media" }], { priorities: ["media"] });
assert.equal(withPriority.length, 1);

console.log("workshop-schedule-filters.test.ts OK");
