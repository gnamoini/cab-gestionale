import { PDFDocument } from "pdf-lib";
import { isImageCaptureMime, normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import type { PageObject } from "@/lib/document-capture/model/page-object";

function imagePageObject(bytes: Uint8Array): PageObject[] {
  return [
    {
      index: 0,
      bytes,
      rotation: 0,
      isEmpty: bytes.byteLength < 100,
      byteSize: bytes.byteLength,
    },
  ];
}

async function parsePdfPages(pdfBytes: Uint8Array): Promise<PageObject[]> {
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

/** Physical Parser — PDF multipagina o singola immagine (foto scheda). */
export async function parsePhysicalPages(bytes: Uint8Array, mime?: string | null): Promise<PageObject[]> {
  const resolved = normalizeCaptureMime({ mime, bytes });
  if (isImageCaptureMime(resolved)) {
    return imagePageObject(bytes);
  }

  try {
    return await parsePdfPages(bytes);
  } catch {
    const sniffed = normalizeCaptureMime({ bytes });
    if (isImageCaptureMime(sniffed)) {
      return imagePageObject(bytes);
    }
    throw new Error("Formato file non supportato: usa PDF o immagine (JPEG, PNG, WebP).");
  }
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
