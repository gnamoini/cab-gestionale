import assert from "node:assert/strict";
import {
  hybridFieldsToCaptureExtraction,
  mergeHybridFields,
  needsGeminiFallback,
} from "@/lib/document-capture/extraction/hybrid-extraction-merge";
import type { HybridField } from "@/lib/document-capture/extraction/hybrid-extraction-types";

const ocrCliente: HybridField = {
  key: "cliente",
  value: "ACME",
  confidence: 0.6,
  source: "template_ocr",
};
const pdfCliente: HybridField = {
  key: "cliente",
  value: "ACME PDF",
  confidence: 0.5,
  source: "pdf_text",
};
const merged = mergeHybridFields([[pdfCliente], [ocrCliente]]);
assert.equal(merged[0]?.value, "ACME");
assert.equal(merged[0]?.source, "template_ocr");

const ingressoOk: HybridField[] = [
  { key: "data_ingresso", value: "18/06/2024", confidence: 0.7, source: "template_ocr" },
  { key: "cliente", value: "CAB", confidence: 0.7, source: "template_ocr" },
  { key: "attrezzatura_marca", value: "CAT", confidence: 0.5, source: "template_ocr" },
];
assert.equal(needsGeminiFallback(ingressoOk, "ingresso"), false);

const ingressoMissing: HybridField[] = [
  { key: "cliente", value: "CAB", confidence: 0.7, source: "template_ocr" },
];
assert.equal(needsGeminiFallback(ingressoMissing, "ingresso"), true);
assert.equal(needsGeminiFallback([], null), true);

const capture = hybridFieldsToCaptureExtraction(ingressoOk, "ingresso");
assert.equal(capture.schedaTipo, "ingresso");
assert.ok(capture.fields.length >= 3);

console.log("hybrid-extraction-merge.test.ts OK");
