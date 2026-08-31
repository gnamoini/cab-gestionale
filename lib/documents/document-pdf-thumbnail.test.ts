import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { generatePdfThumbnailViaPdfJs } from "@/lib/documents/document-pdf-thumbnail.server";

async function minimalPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("ISO test", { x: 40, y: 100, size: 18, font });
  return new Uint8Array(await doc.save());
}

async function main(): Promise<void> {
  const pdf = await minimalPdfBytes();
  const thumb = await generatePdfThumbnailViaPdfJs(pdf);
  assert.ok(thumb && thumb.length > 100, "pdfjs thumbnail should produce webp bytes");
  console.log("document-pdf-thumbnail.test.ts OK");
}

void main();
