import assert from "node:assert/strict";
import {
  normalizeFornitoreKey,
  parseProduttoriByFornitore,
  produttoriForFornitore,
  renameFornitoreInProduttoriMap,
} from "@/lib/magazzino/fornitore-produttore-master";

assert.equal(normalizeFornitoreKey("  Ricambi   Express "), "ricambi express");

const map = parseProduttoriByFornitore({
  "Ricambi Express": ["ACME", "Beta"],
  other: ["X"],
});
assert.deepEqual(
  produttoriForFornitore(
    { marche: [], categorie: [], mezziCompatibili: [], fornitori: [], produttoriByFornitore: map },
    "Ricambi Express",
  ),
  [
  "ACME",
  "Beta",
]);

const renamed = renameFornitoreInProduttoriMap(map, "Ricambi Express", "RE Nuovo");
assert.ok(renamed["re nuovo"]?.includes("ACME"));
assert.equal(renamed["ricambi express"], undefined);

console.log("fornitore-produttore-master.test.ts OK");
