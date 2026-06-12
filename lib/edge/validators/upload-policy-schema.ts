import { STORAGE_LIMITS } from "@/src/lib/storage/storage-config";
import type { LavorazioneDocumentStorageTipo } from "@/src/lib/storage/storage-paths";

export const ALLOWED_ARCHIVE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/csv",
  "application/octet-stream",
]);

const LAVORAZIONE_TIPI = new Set<LavorazioneDocumentStorageTipo>(["preventivo_upload", "ddt"]);

export type UploadPolicyBody = {
  source?: "archive" | "lavorazione";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  contentHash?: string;
  categoria?: string;
  lavorazioneId?: string;
  tipo?: LavorazioneDocumentStorageTipo;
};

export type UploadPolicyValidationResult =
  | { ok: true; normalized: { source: "archive" | "lavorazione"; fileName: string; fileSize: number; mimeType: string } }
  | { ok: false; status: 400 | 413; error: string };

export function validateUploadPolicyBody(body: UploadPolicyBody): UploadPolicyValidationResult {
  const source = body.source === "lavorazione" ? "lavorazione" : "archive";
  const fileName = body.fileName?.trim() ?? "";
  const fileSize = Number(body.fileSize ?? 0);
  const mimeType = (body.mimeType?.trim() || "application/octet-stream").toLowerCase();

  if (!fileName) return { ok: false, status: 400, error: "fileName mancante" };
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { ok: false, status: 400, error: "fileSize non valido" };
  }
  if (fileSize > STORAGE_LIMITS.documentiMaxBytes) {
    return { ok: false, status: 413, error: "File troppo grande" };
  }

  if (source === "archive") {
    if (!ALLOWED_ARCHIVE_MIME.has(mimeType) && mimeType !== "application/octet-stream") {
      return { ok: false, status: 400, error: "Tipo file non consentito" };
    }
    return { ok: true, normalized: { source, fileName, fileSize, mimeType } };
  }

  if (mimeType !== "application/pdf") {
    return { ok: false, status: 400, error: "Solo PDF consentiti per documenti lavorazione" };
  }
  const lavorazioneId = body.lavorazioneId?.trim() ?? "";
  const tipo = body.tipo;
  if (!lavorazioneId || !tipo || !LAVORAZIONE_TIPI.has(tipo)) {
    return { ok: false, status: 400, error: "lavorazioneId e tipo richiesti" };
  }
  return { ok: true, normalized: { source, fileName, fileSize, mimeType } };
}

export function parseContentHash(raw: string | undefined): string | null {
  const hash = raw?.trim().toLowerCase().replace(/[^a-f0-9]/g, "") ?? "";
  return hash.length === 64 ? hash : null;
}
