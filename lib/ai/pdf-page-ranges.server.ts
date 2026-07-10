import "server-only";

import { PDFDocument } from "pdf-lib";

export type PdfPageRangeChunk = {
  /** 1-based inclusive */
  fromPage: number;
  /** 1-based inclusive */
  toPage: number;
  bytes: Uint8Array;
};

/** ponytail: pdf-lib page copy — upgrade path: stream pages for very large PDFs. */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function splitPdfIntoPageRangeChunks(
  bytes: Uint8Array,
  pagesPerChunk: number,
): Promise<PdfPageRangeChunk[]> {
  const pageCount = await getPdfPageCount(bytes);
  if (pageCount <= 0) return [];

  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const chunks: PdfPageRangeChunk[] = [];
  const size = Math.max(1, Math.floor(pagesPerChunk));

  for (let start = 0; start < pageCount; start += size) {
    const end = Math.min(pageCount, start + size);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const target = await PDFDocument.create();
    const copied = await target.copyPages(source, indices);
    for (const page of copied) target.addPage(page);
    chunks.push({
      fromPage: start + 1,
      toPage: end,
      bytes: new Uint8Array(await target.save()),
    });
  }

  return chunks;
}
