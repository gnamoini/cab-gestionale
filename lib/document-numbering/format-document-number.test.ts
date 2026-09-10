import assert from "node:assert/strict";
import {
  DOCUMENT_SERIES_DEFAULT,
  formatDocumentNumber,
  formatDdtDocumentNumber,
  formatInvoiceDocumentNumber,
  normalizeDocumentSeries,
} from "@/lib/document-numbering/format-document-number";

assert.equal(normalizeDocumentSeries(null), DOCUMENT_SERIES_DEFAULT);
assert.equal(normalizeDocumentSeries(""), DOCUMENT_SERIES_DEFAULT);
assert.equal(normalizeDocumentSeries("  a "), "A");
assert.equal(normalizeDocumentSeries("default"), "DEFAULT");

assert.equal(formatDocumentNumber("fattura", 2026, 1), "FT 2026/001");
assert.equal(formatDocumentNumber("fattura", 2026, 42), "FT 2026/042");
assert.equal(formatDocumentNumber("nota_credito", 2026, 1), "NC 2026/001");
assert.equal(formatDocumentNumber("nota_debito", 2026, 1), "ND 2026/001");
assert.equal(formatDocumentNumber("ddt", 2026, 1, "A"), "DDT A/2026/001");
assert.equal(formatDocumentNumber("ddt", 2026, 1, DOCUMENT_SERIES_DEFAULT), "DDT 2026/001");

assert.equal(
  formatInvoiceDocumentNumber({ document_type: "fattura", anno: 2026, numero: null }),
  "Bozza",
);
assert.equal(
  formatInvoiceDocumentNumber({ document_type: "nota_credito", anno: 2026, numero: 1 }),
  "NC 2026/001",
);

assert.equal(formatDdtDocumentNumber({ numero: null, anno: 2026, serie: "A" }), "Bozza");
assert.equal(formatDdtDocumentNumber({ numero: 10, anno: 2026, serie: "A" }), "DDT A/2026/010");

console.log("format-document-number.test.ts OK");
