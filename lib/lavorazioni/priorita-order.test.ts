import assert from "node:assert/strict";
import {
  assertValidPriorita,
  normalizePrioritaLavorazione,
  prioritaSortWeight,
} from "@/lib/lavorazioni/priorita-order";

assert.equal(normalizePrioritaLavorazione("alta"), "alta");
assert.equal(normalizePrioritaLavorazione("normale"), "media");
assert.equal(normalizePrioritaLavorazione("invalid"), "media");
assert.equal(normalizePrioritaLavorazione(null), "media");
assert.equal(assertValidPriorita(undefined), "media");
assert.equal(assertValidPriorita("urgente"), "urgente");

assert.equal(prioritaSortWeight("normale"), prioritaSortWeight("media"));

console.log("priorita-order.test.ts OK");
