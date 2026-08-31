import "server-only";

import sharp from "sharp";
import { generatePdfThumbnailViaPdfJs } from "@/lib/documents/document-pdf-thumbnail.server";
import { mimeTypeFromFileName, sniffMimeTypeFromBytes } from "@/lib/documents/document-mime";

export const DOCUMENT_THUMB_MAX_WIDTH = 320;
export const DOCUMENT_THUMB_MAX_BYTES_FOR_GENERATE = 20 * 1024 * 1024;

export type ThumbnailGenerateInput = {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
};

function resolveThumbnailMime(input: ThumbnailGenerateInput): string {
  const sniffed = sniffMimeTypeFromBytes(input.bytes);
  if (sniffed) return sniffed;
  const fromName = mimeTypeFromFileName(input.fileName);
  if (fromName !== "application/octet-stream") return fromName;
  return input.contentType || fromName;
}

/** Returns WebP thumbnail bytes or null if type unsupported / generation fails. */
export async function generateDocumentThumbnailBytes(input: ThumbnailGenerateInput): Promise<Uint8Array | null> {
  if (input.bytes.length > DOCUMENT_THUMB_MAX_BYTES_FOR_GENERATE) return null;

  const mime = resolveThumbnailMime(input);
  const isPdf = mime === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  if (!isPdf && !isImage) return null;

  if (isPdf) {
    try {
      const out = await sharp(input.bytes, { page: 0, density: 120 })
        .rotate()
        .resize({
          width: DOCUMENT_THUMB_MAX_WIDTH,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 80 })
        .toBuffer();
      return new Uint8Array(out);
    } catch {
      /* sharp libvips often lacks PDF/poppler — fallback below */
    }
    return generatePdfThumbnailViaPdfJs(input.bytes);
  }

  try {
    const out = await sharp(input.bytes, { failOn: "none" })
      .rotate()
      .resize({
        width: DOCUMENT_THUMB_MAX_WIDTH,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 80 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
