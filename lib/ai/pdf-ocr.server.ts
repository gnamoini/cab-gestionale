import "server-only";

/**
 * Bridge OCR Tesseract per spare-parts — riusa worker document-capture senza dipendenze UI.
 * ponytail: senza canvas PDF→PNG; OCR su buffer immagine già rasterizzato.
 */
export { recognizePngBuffer, warmTesseractWorker } from "@/lib/document-capture/extraction/tesseract-ocr.server";

export async function recognizeImageBytes(
  bytes: Buffer,
  mimeType: string,
): Promise<{ text: string; confidence: number }> {
  const lower = mimeType.toLowerCase();
  if (lower.includes("png") || lower.includes("jpeg") || lower.includes("jpg") || lower.includes("webp")) {
    const { recognizePngBuffer } = await import("@/lib/document-capture/extraction/tesseract-ocr.server");
    return recognizePngBuffer(bytes, "block");
  }
  return { text: "", confidence: 0 };
}
