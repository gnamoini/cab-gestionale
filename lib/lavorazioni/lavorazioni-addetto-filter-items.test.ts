import assert from "node:assert/strict";
import {
  FILTER_ALL,
  LAVORAZIONI_ADDETTO_FILTER_ALL_LABEL,
  buildLavorazioniAddettoFilterItems,
  normalizeAddettoFilterValue,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";

const items = buildLavorazioniAddettoFilterItems([
  { id: "a1", nome: "Mario", cognome: "Rossi" },
  { id: "a2", nome: "Luigi", cognome: "Verdi" },
]);

assert.equal(items[0]?.value, FILTER_ALL);
assert.equal(items[0]?.label, LAVORAZIONI_ADDETTO_FILTER_ALL_LABEL);
assert.equal(items[1]?.label, "Mario Rossi");
assert.equal(items[2]?.label, "Luigi Verdi");
assert.equal(normalizeAddettoFilterValue(""), FILTER_ALL);
assert.equal(normalizeAddettoFilterValue("Mario Rossi"), "Mario Rossi");

console.log("lavorazioni-addetto-filter-items.test.ts OK");
