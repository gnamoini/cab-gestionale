import assert from "node:assert/strict";
import {
  ORDINE_FORNITORE_EDITOR_STATUSES,
  ordineFornitoreStatusEditorItems,
  ordineFornitoreStatusFilterItems,
  ordineFornitoreStatusLabel,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";

assert.deepEqual(ORDINE_FORNITORE_EDITOR_STATUSES, [
  "bozza",
  "inviato",
  "in_consegna",
  "consegnato",
]);
assert.equal(ordineFornitoreStatusLabel("in_consegna"), "In consegna");
assert.equal(ordineFornitoreStatusLabel("consegnato"), "Consegnato");
assert.equal(ordineFornitoreStatusEditorItems().length, 4);
assert.equal(ordineFornitoreStatusFilterItems()[0]?.value, "");
assert.equal(ordineFornitoreStatusFilterItems().length, 6);
assert.ok(ordineFornitoreStatusEditorItems().every((item) => item.pillStyle));

console.log("ordine-fornitore-status-ui.test.ts OK");
