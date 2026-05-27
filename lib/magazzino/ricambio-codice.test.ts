import assert from "node:assert/strict";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";

assert.equal(normalizeRicambioCodice("abc123"), "ABC123");
assert.equal(normalizeRicambioCodice("AbC-12"), "ABC-12");
assert.equal(normalizeRicambioCodice(""), "");
assert.equal(normalizeRicambioCodice("già"), "GIÀ");

console.log("ricambio-codice.test.ts OK");
