import assert from "node:assert/strict";
import { formatIdentificazionePdfCell } from "@/lib/lavorazioni/lavorazioni-pdf-format";

assert.equal(formatIdentificazionePdfCell("", "", ""), "");
assert.equal(formatIdentificazionePdfCell("AB123CD", "", ""), "AB123CD");
assert.equal(formatIdentificazionePdfCell("", "MAT-1", ""), "MAT-1");
assert.equal(formatIdentificazionePdfCell("", "", "42"), "N. 42");
assert.equal(formatIdentificazionePdfCell("AB123CD", "MAT-1", "42"), "AB123CD\nMAT-1\nN. 42");

console.log("lavorazioni-pdf-format.test.ts OK");
