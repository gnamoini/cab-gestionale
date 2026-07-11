import { mimeTypeFromFileName, sniffMimeTypeFromBytes } from "@/lib/documents/document-mime";
import { isAllowedCaptureMime } from "@/lib/document-capture/mime-allowlist";

export function isImageCaptureMime(mime: string): boolean {
  return mime.trim().toLowerCase().startsWith("image/");
}

/** Risolve MIME consentito da header, nome file o magic bytes. */
export function normalizeCaptureMime(input: {
  mime?: string | null;
  fileName?: string;
  bytes?: Uint8Array;
}): string {
  let raw = (input.mime ?? "").trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (raw === "image/jpg") raw = "image/jpeg";
  if (isAllowedCaptureMime(raw)) return raw;

  if (input.fileName) {
    const ext = input.fileName.split(".").pop()?.toLowerCase();
    if (ext === "heic") return "image/heic";
    if (ext === "heif") return "image/heif";
    const fromName = mimeTypeFromFileName(input.fileName);
    if (fromName !== "application/octet-stream" && isAllowedCaptureMime(fromName)) return fromName;
  }

  if (input.bytes) {
    const sniffed = sniffMimeTypeFromBytes(input.bytes);
    if (sniffed && isAllowedCaptureMime(sniffed)) return sniffed;
  }

  return raw || "application/octet-stream";
}

export function resolveCaptureMimeFromFile(file: File): string {
  return normalizeCaptureMime({ mime: file.type, fileName: file.name });
}
