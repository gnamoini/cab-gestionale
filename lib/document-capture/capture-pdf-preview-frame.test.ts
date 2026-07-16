import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCapturePdfPreviewFrameHtml } from "./capture-pdf-preview-frame-html";
import { computeCapturePdfEmbedHeightPx } from "./capture-pdf-embed-height";

async function minimalPdfBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 800]);
  page.drawText("test", { x: 40, y: 700, size: 12, font });
  return new Uint8Array(await pdf.save());
}

async function run() {
  const bytes = await minimalPdfBytes();
  const height = await computeCapturePdfEmbedHeightPx(bytes, 400);
  assert.equal(height, 800);

  const html = buildCapturePdfPreviewFrameHtml({
    fileUrl: "/api/document-capture/x/file",
    embedHeightPx: height,
    theme: "dark",
  });
  assert.match(html, /scrollbar=0/);
  assert.match(html, /class="dark"/);
  assert.match(html, /--cab-scrollbar-track: rgb\(24 24 27/);
  assert.match(html, /height:800px/);

  console.log("capture-pdf-preview-frame.test.ts OK");
}

void run();
