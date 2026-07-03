import assert from "node:assert/strict";
import { computeHeatmapCells } from "@/lib/workshop-schedule/intelligence/heatmap/compute-heatmap";

const day = "2026-07-03";

const cells = computeHeatmapCells(
  [
    {
      startAt: `${day}T07:00:00`,
      endAt: `${day}T09:00:00`,
      eventType: "intervento_programmato",
      planningStatus: "confirmed",
    },
    {
      startAt: `${day}T08:00:00`,
      endAt: `${day}T09:00:00`,
      eventType: "blocco_agenda",
      planningStatus: "confirmed",
    },
  ],
  [day],
);

const h7 = cells.find((c) => c.hourSlot === 7);
const h8 = cells.find((c) => c.hourSlot === 8);
assert.ok(h7);
assert.ok(h8);
assert.equal(h7!.loadMinutes, 60);
assert.ok(h7!.saturation > 0);
assert.ok(h8!.availableMinutes <= 60);

const blockedOnly = computeHeatmapCells(
  [
    {
      startAt: `${day}T10:00:00`,
      endAt: `${day}T11:00:00`,
      eventType: "blocco_agenda",
      planningStatus: "confirmed",
    },
  ],
  [day],
);
const h10 = blockedOnly.find((c) => c.hourSlot === 10)!;
assert.equal(h10.loadMinutes, 0);
assert.equal(h10.availableMinutes, 0);

console.log("heatmap-saturation.test.ts OK");
