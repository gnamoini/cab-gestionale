import "server-only";

import sharp from "sharp";
import { mimeTypeFromFileName } from "@/lib/documents/document-mime";

export const DOCUMENT_THUMB_MAX_WIDTH = 320;
export const DOCUMENT_THUMB_MAX_BYTES_FOR_GENERATE = 20 * 1024 * 1024;

export type ThumbnailGenerateInput = {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
};

/** Returns WebP thumbnail bytes or null if type unsupported / sharp fails. */
export async function generateDocumentThumbnailBytes(input: ThumbnailGenerateInput): Promise<Uint8Array | null> {
  if (input.bytes.length > DOCUMENT_THUMB_MAX_BYTES_FOR_GENERATE) return null;

  const mime = input.contentType || mimeTypeFromFileName(input.fileName);
  const isPdf = mime === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  if (!isPdf && !isImage) return null;

  try {
    let pipeline = isPdf
      ? sharp(input.bytes, { page: 0, density: 120 })
      : sharp(input.bytes, { failOn: "none" });

    pipeline = pipeline.rotate().resize({
      width: DOCUMENT_THUMB_MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    });

    const out = await pipeline.webp({ quality: 80 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
