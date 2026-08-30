import assert from "node:assert/strict";
import { isListinoCategoria, isListinoDocument } from "@/lib/documents/document-listino-detect";

assert.equal(isListinoCategoria("listino"), true);
assert.equal(isListinoCategoria("listini"), true);
assert.equal(isListinoCategoria("cataloghi"), false);

assert.equal(isListinoDocument({ categoria: "listino" }), true);
assert.equal(isListinoDocument({ categoria: "listini" }), true);
assert.equal(
  isListinoDocument({ categoria: "cataloghi", meta: { aiDocumentKind: "price_list" } }),
  true,
);
assert.equal(isListinoDocument({ categoria: "cataloghi", meta: { aiSparePartsEnabled: true } }), false);

console.log("document-listino-detect.test.ts OK");
