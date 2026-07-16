import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { drawSchedaIngressoBlankPdf } from "@/lib/pdf/schede-blank-layout";
import {
  detectSchedaTipoFromPdfText,
  extractNativePdfTextFields,
} from "@/lib/document-capture/extraction/native-pdf-text-extractor";

async function main(): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawSchedaIngressoBlankPdf(doc);
  const bytes = new Uint8Array(doc.output("arraybuffer"));

  const { pages, hasTextLayer } = await extractNativePdfTextFields(bytes, "application/pdf");
  assert.ok(hasTextLayer, "blank CAB PDF should expose a text layer");
  const tipo = detectSchedaTipoFromPdfText(pages);
  assert.equal(tipo, "ingresso");
  assert.ok(pages[0]?.text.toUpperCase().includes("SCHEDA INGRESSO"));

  console.log("native-pdf-text-extractor.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
