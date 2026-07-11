import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { parsePhysicalPages } from "@/lib/document-capture/physical/physical-parser";

async function main(): Promise<void> {
  async function makePdf(pages: string[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const text of pages) {
      const page = pdf.addPage([400, 200]);
      page.drawText(text, { x: 40, y: 100, size: 12, font });
    }
    return new Uint8Array(await pdf.save());
  }

  const bytes = await makePdf(["pagina uno", "pagina due"]);
  const parsed = await parsePhysicalPages(bytes);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]!.index, 0);
  assert.equal(parsed[1]!.index, 1);
  assert.ok(parsed[0]!.byteSize > 0);

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
  const imagePages = await parsePhysicalPages(jpeg, "image/jpeg");
  assert.equal(imagePages.length, 1);
  assert.equal(imagePages[0]!.index, 0);
  assert.equal(imagePages[0]!.byteSize, jpeg.byteLength);

  console.log("physical-parser.test.ts OK");
}

void main();
