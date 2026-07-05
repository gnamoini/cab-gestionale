import assert from "node:assert/strict";
import {
  buildClientPortalStatoProgress,
  clientPortalStatoProgressFillPcts,
  enrichClientPortalStatoProgressWithTimeline,
} from "@/lib/lavorazioni/client-portal-stato-progress";

const statiOpts = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "completata", label: "Completata", color: "#15803d" },
];

const mid = buildClientPortalStatoProgress(statiOpts, "in_lavorazione");
assert.equal(mid.currentIndex, 1);
assert.equal(mid.progressPct, 50);
assert.equal(mid.steps[1]?.status, "current");
assert.equal(mid.steps[0]?.status, "done");
assert.equal(mid.steps[2]?.status, "upcoming");

const done = buildClientPortalStatoProgress(statiOpts, "completata");
assert.equal(done.currentIndex, 2);
assert.equal(done.progressPct, 100);

const fillMid = clientPortalStatoProgressFillPcts(1, 3);
assert.equal(fillMid.solidPct, 50);
assert.equal(fillMid.leadPct, 80);

const enriched = enrichClientPortalStatoProgressWithTimeline(mid, [
  { statoId: "accettazione", at: "2026-05-29T13:04:00.000Z" },
  { statoId: "in_lavorazione", at: "2026-06-01T10:30:00.000Z" },
]);
assert.equal(enriched.steps[0]?.changedAt, "2026-05-29T13:04:00.000Z");
assert.equal(enriched.steps[1]?.changedAt, "2026-06-01T10:30:00.000Z");
assert.equal(enriched.steps[2]?.changedAt, undefined);

console.log("client-portal-stato-progress.test.ts OK");
