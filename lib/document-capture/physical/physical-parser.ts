import { PDFDocument } from "pdf-lib";
import type { PageObject } from "@/lib/document-capture/model/page-object";

/** Physical Parser — solo struttura fisica (INV-11). */
export async function parsePhysicalPages(pdfBytes: Uint8Array): Promise<PageObject[]> {
  const source = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  const pages: PageObject[] = [];

  for (let i = 0; i < pageCount; i += 1) {
    const target = await PDFDocument.create();
    const [copied] = await target.copyPages(source, [i]);
    target.addPage(copied);
    const bytes = new Uint8Array(await target.save());
    const pg = source.getPage(i);
    const rotation = pg.getRotation().angle;

    pages.push({
      index: i,
      bytes,
      rotation,
      isEmpty: bytes.byteLength < 800,
      byteSize: bytes.byteLength,
    });
  }

  markDuplicatePages(pages);
  return pages;
}

function markDuplicatePages(pages: PageObject[]): void {
  const seen = new Map<string, number>();
  for (const p of pages) {
    const sig = `${p.byteSize}:${p.rotation}`;
    const first = seen.get(sig);
    if (first != null && p.byteSize < 50_000) {
      p.isDuplicateOf = first;
    } else {
      seen.set(sig, p.index);
    }
  }
}
