import "server-only";

import { createHash } from "node:crypto";
import { IMPORT_MAX_FILE_BYTES } from "@/lib/data-import/core/types";

export function decodeImportFileBase64(fileBase64: string): Uint8Array {
  const raw = fileBase64.includes(",") ? fileBase64.split(",").pop()! : fileBase64;
  const buf = Buffer.from(raw, "base64");
  if (buf.byteLength > IMPORT_MAX_FILE_BYTES) {
    throw new Error(`File troppo grande (max ${Math.round(IMPORT_MAX_FILE_BYTES / 1024 / 1024)} MB).`);
  }
  return new Uint8Array(buf);
}

export function sha256ImportFile(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
