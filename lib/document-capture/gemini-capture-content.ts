import { isImageCaptureMime } from "@/lib/document-capture/capture-mime";

type GeminiCaptureDocumentPart =
  | { type: "image"; image: Buffer; mediaType: string }
  | { type: "file"; data: Buffer; mediaType: string };

/** Parte documento per Gemini — ponytail: immagini devono usare ImagePart, non FilePart. */
export function buildGeminiCaptureDocumentPart(bytes: Uint8Array, mime: string): GeminiCaptureDocumentPart {
  const buffer = Buffer.from(bytes);
  if (isImageCaptureMime(mime)) {
    return { type: "image", image: buffer, mediaType: mime };
  }
  return { type: "file", data: buffer, mediaType: mime };
}
