import assert from "node:assert/strict";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import {
  isOrdineFornitoreEditorDirty,
  ordineFornitoreHasUserData,
  ordineFornitoreNeedsCloseConfirm,
} from "@/lib/ordini-fornitori/ordine-fornitore-editor-dirty";

const empty = buildEmptyOrdineFornitore();
const baseline = { ...empty, dataOrdine: "2026-07-08" };

assert.equal(isOrdineFornitoreEditorDirty(baseline, baseline), false);
assert.equal(ordineFornitoreHasUserData(baseline), false);
assert.equal(ordineFornitoreNeedsCloseConfirm(baseline, baseline), false);

const dateOnly = { ...baseline, dataOrdine: "2026-07-09" };
assert.equal(isOrdineFornitoreEditorDirty(dateOnly, baseline), true);
assert.equal(ordineFornitoreHasUserData(dateOnly), false);
assert.equal(ordineFornitoreNeedsCloseConfirm(dateOnly, baseline), false);

const withFornitore = { ...baseline, fornitoreLabel: "Ricambi SRL" };
assert.equal(ordineFornitoreNeedsCloseConfirm(withFornitore, baseline), true);

console.log("ordine-fornitore-editor-dirty.test.ts ok");
