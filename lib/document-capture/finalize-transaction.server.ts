import "server-only";

import {
  DOCUMENT_CAPTURE_MAX_BYTES,
  isAllowedCaptureMime,
} from "@/lib/document-capture/mime-allowlist";
import { sha256Hex } from "@/lib/document-capture/sha256.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type FinalizeCaptureResult = {
  ok: true;
  id: string;
  status?: string;
  duplicateOf?: string | null;
  finalizedAt?: string | null;
};

export async function finalizeDocumentCaptureInTransaction(input: {
  captureId: string;
  storagePath: string;
}): Promise<FinalizeCaptureResult> {
  const sb = await createSupabaseServerUserClient();

  const { data: fileData, error: downloadError } = await sb.storage
    .from("document-capture")
    .download(input.storagePath);

  if (downloadError || !fileData) {
    throw new Error("File non trovato nello storage");
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  if (bytes.byteLength > DOCUMENT_CAPTURE_MAX_BYTES) {
    throw new Error("File troppo grande");
  }

  const mime = fileData.type || "application/octet-stream";
  if (!isAllowedCaptureMime(mime)) {
    throw new Error("Tipo file non consentito");
  }
  if (mime === "image/svg+xml") {
    throw new Error("SVG non consentito");
  }

  const sha256 = sha256Hex(bytes);

  const { data, error } = await sb.rpc("document_capture_finalize", {
    p_capture_id: input.captureId,
    p_sha256: sha256,
    p_mime: mime,
    p_file_size_bytes: bytes.byteLength,
    p_storage_version: "1",
    p_storage_etag: sha256.slice(0, 32),
  });

  if (error) {
    if (error.message.includes("invalid_status_transition")) {
      const err = new Error(error.message);
      (err as Error & { code?: string }).code = "invalid_status_transition";
      throw err;
    }
    throw new Error(error.message);
  }

  const result = data as {
    ok?: boolean;
    id?: string;
    status?: string;
    duplicateOf?: string | null;
    finalizedAt?: string | null;
  };

  return {
    ok: true,
    id: result.id ?? input.captureId,
    status: result.status,
    duplicateOf: result.duplicateOf ?? null,
    finalizedAt: result.finalizedAt ?? null,
  };
}
