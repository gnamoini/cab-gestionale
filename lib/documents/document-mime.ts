const EXTENSION_MIME: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
  csv: "text/csv",
};

const MIME_TO_EXT: Readonly<Record<string, string>> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

export function mimeTypeFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  const ext = fileName.slice(dot + 1).toLowerCase();
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

/** Magic-byte sniff per delivery quando nome/path storage non hanno estensione. */
export function sniffMimeTypeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

export function extensionFromMimeType(mime: string): string | null {
  const normalized = mime.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  return MIME_TO_EXT[normalized] ?? null;
}

export function ensureFileNameWithMimeExtension(fileName: string, mime: string): string {
  const trimmed = fileName.trim() || "documento";
  if (/\.[a-z0-9]{2,8}$/i.test(trimmed)) return trimmed;
  const ext = extensionFromMimeType(mime);
  return ext ? `${trimmed}${ext}` : trimmed;
}
