import assert from "node:assert/strict";
import { mergeFornitoriOrdineOptions } from "@/lib/magazzino/fornitori-ordine-options";

assert.deepEqual(
  mergeFornitoriOrdineOptions({
    marche: ["Bosch", "ACME"],
    fornitori: ["Ricambi Express", "acme"],
  }),
  ["ACME", "Bosch", "Ricambi Express"],
);

assert.deepEqual(mergeFornitoriOrdineOptions({ marche: [], fornitori: [] }), []);

console.log("fornitori-ordine-options.test.ts OK");
