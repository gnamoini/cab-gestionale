import assert from "node:assert/strict";
import { formatClientePdfCell, formatIdentificazionePdfCell } from "@/lib/lavorazioni/lavorazioni-pdf-format";

assert.equal(formatClientePdfCell("Cliente", "", ""), "Cliente");
assert.equal(formatClientePdfCell("Cliente", "Cantiere Nord", ""), "Cliente\nCantiere Nord");
assert.equal(formatClientePdfCell("OMB", "", "Si.Eco"), "OMB (Si.Eco)");
assert.equal(
  formatClientePdfCell("Cliente", "Cantiere Nord", "Utilizzatore"),
  "Cliente (Utilizzatore)\nCantiere Nord",
);
assert.equal(formatClientePdfCell("", "—", "—"), "—");

assert.equal(formatIdentificazionePdfCell("", "", ""), "");
assert.equal(formatIdentificazionePdfCell("AB123CD", "", ""), "Targa: AB123CD");
assert.equal(formatIdentificazionePdfCell("", "MAT-1", ""), "Matr.: MAT-1");
assert.equal(formatIdentificazionePdfCell("", "", "42"), "Scud.: 42");
assert.equal(
  formatIdentificazionePdfCell("AB123CD", "MAT-1", "42"),
  "Targa: AB123CD\nMatr.: MAT-1\nScud.: 42",
);

console.log("lavorazioni-pdf-format.test.ts OK");
