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
  "confermato",
  "spedito",
  "ricevuto",
]);
assert.equal(ordineFornitoreStatusLabel("spedito"), "Spedito");
assert.equal(ordineFornitoreStatusLabel("ricevuto"), "Ricevuto");
assert.equal(ordineFornitoreStatusEditorItems().length, 5);
assert.equal(ordineFornitoreStatusFilterItems()[0]?.value, "");
assert.equal(ordineFornitoreStatusFilterItems().length, 7);
assert.ok(ordineFornitoreStatusEditorItems().every((item) => item.pillStyle));

console.log("ordine-fornitore-status-ui.test.ts OK");
