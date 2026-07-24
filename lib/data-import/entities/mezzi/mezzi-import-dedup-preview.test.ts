import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { matchMezziImportRow, MEZZI_IMPORT_UPDATE_THRESHOLD } from "@/lib/data-import/entities/mezzi/mezzi-import-match-score";

// Scoring: solo scuderia non supera soglia update
const scuderiaOnly = matchMezziImportRow(
  { numero_scuderia: "99" },
  [{ id: "x", numero_scuderia: "99" }],
  [],
);
assert.equal(scuderiaOnly.kind, "manual_review");
if (scuderiaOnly.kind === "manual_review") {
  assert.ok(scuderiaOnly.candidates[0]!.score < MEZZI_IMPORT_UPDATE_THRESHOLD);
}

// VIN → suggest update
const vin = matchMezziImportRow(
  { telaio: "1HGBH41JXMN109186" },
  [{ id: "v", telaio_num: "1HGBH41JXMN109186" }],
  [],
);
assert.equal(vin.kind, "suggest_update");

const plugin = fs.readFileSync(
  path.join(process.cwd(), "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts"),
  "utf8",
);
assert.match(plugin, /matchMezziImportRow/);

console.log("mezzi-import-dedup-preview.test.ts OK");
