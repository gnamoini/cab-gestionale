import { PDFDocument } from "pdf-lib";

/** Altezza embed iframe (px) per larghezza viewport — pdf-lib page sizes, no render. */
export async function computeCapturePdfEmbedHeightPx(
  bytes: Uint8Array,
  viewportWidthPx: number,
): Promise<number> {
  const widthPx = Math.max(1, Math.round(viewportWidthPx));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  let total = 0;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (width <= 0) continue;
    total += (widthPx / width) * height;
  }
  return Math.max(Math.ceil(total), widthPx);
}
