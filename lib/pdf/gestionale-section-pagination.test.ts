import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { compactFieldRowCount, tripleFieldRowCount } from "@/lib/pdf/gestionale-section-table";
import { ensurePdfSpace, PDF_MARGIN_TOP } from "@/lib/pdf/preventivo-pdf-layout";

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const pageH = doc.internal.pageSize.getHeight();
const riepilogoEst = 9 + 9 + 3 * 7 + 4;
const startY = pageH - 25;

const y = ensurePdfSpace(doc, startY, riepilogoEst);
assert.equal(doc.getNumberOfPages(), 2);
assert.equal(y, PDF_MARGIN_TOP);

assert.equal(compactFieldRowCount(5), 3);
assert.equal(tripleFieldRowCount(7), 3);

console.log("gestionale-section-pagination.test.ts: ok");
