import assert from "node:assert/strict";
import { buildHealthScoreAreaTargets } from "@/lib/health-score/explain/health-score-area-targets";

const media = buildHealthScoreAreaTargets("media");
assert.ok(media.some((g) => g.areaLabel === "Personale"), "gruppo personale");
const personale = media.find((g) => g.areaLabel === "Personale")!;
assert.ok(
  personale.rows.some((r) => r.label.includes("Ore lavorate") && r.target.includes("400")),
  "target ore per officina media",
);

const filtered = buildHealthScoreAreaTargets("piccola", ["Personale", "Produzione"]);
assert.equal(filtered.length, 2);
assert.ok(!filtered.some((g) => g.areaLabel === "Economico"));

console.log("health-score-area-targets.test.ts OK");
