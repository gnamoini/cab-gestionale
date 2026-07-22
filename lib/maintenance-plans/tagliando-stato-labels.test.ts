import assert from "node:assert/strict";
import {
  mapUrgencyToTagliandoStato,
  tagliandoStatoFilterMatches,
} from "@/lib/maintenance-plans/tagliando-stato-labels";
import { groupOverviewByPreset, sortOverviewByNextDue } from "@/lib/maintenance-plans/resolve-mezzo-metering";

assert.equal(mapUrgencyToTagliandoStato("rosso"), "scaduto");
assert.equal(mapUrgencyToTagliandoStato("giallo"), "imminente");
assert.equal(mapUrgencyToTagliandoStato("verde"), "programmato");
assert.equal(mapUrgencyToTagliandoStato("verde", { recentlyCompleted: true }), "completato");
assert.equal(tagliandoStatoFilterMatches("scaduto", "scaduto"), true);
assert.equal(tagliandoStatoFilterMatches("programmato", "scaduto"), false);

const grouped = groupOverviewByPreset([
  { presetId: "p1", presetNome: "A" },
  { presetId: "p1", presetNome: "A" },
  { presetId: "p2", presetNome: "B" },
]);
assert.equal(grouped.length, 2);
assert.equal(grouped[0]!.presetNome, "A");
assert.equal(grouped[0]!.rows.length, 2);

const sorted = sortOverviewByNextDue([
  { nextDateEstimated: "2026-12-01", remainingValue: 100 },
  { nextDateEstimated: "2026-06-01", remainingValue: 50 },
]);
assert.equal(sorted[0]!.nextDateEstimated, "2026-06-01");

console.log("tagliando-stato-labels.test ok");
