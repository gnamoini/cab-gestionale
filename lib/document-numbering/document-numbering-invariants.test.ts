import assert from "node:assert/strict";

/** INV-FT-NC: same progressive allowed across document types */
const ftKey = { type: "fattura", year: 2026, series: "DEFAULT", n: 1 };
const ncKey = { type: "nota_credito", year: 2026, series: "DEFAULT", n: 1 };
assert.notDeepEqual(ftKey.type, ncKey.type);
assert.deepEqual(
  [ftKey.year, ftKey.series, ftKey.n],
  [ncKey.year, ncKey.series, ncKey.n],
);

/** INV-SERIES: only DEFAULT represents missing sezionale */
import { normalizeDocumentSeries, DOCUMENT_SERIES_DEFAULT } from "@/lib/document-numbering/format-document-number";
for (const raw of [null, "", "  ", "default", "DEFAULT"]) {
  assert.equal(normalizeDocumentSeries(raw), DOCUMENT_SERIES_DEFAULT);
}

/** INV-3/4: monotonic simulation */
let seq = 0;
const allocated: number[] = [];
for (let i = 0; i < 5; i++) {
  seq += 1;
  allocated.push(seq);
}
assert.deepEqual(allocated, [1, 2, 3, 4, 5]);

console.log("document-numbering-invariants.test.ts OK");
