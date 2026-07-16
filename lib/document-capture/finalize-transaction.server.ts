import "server-only";

import {
  DOCUMENT_CAPTURE_MAX_BYTES,
  isAllowedCaptureMime,
  needsCaptureOfficeConversion,
} from "@/lib/document-capture/mime-allowlist";
import {
  classifyFinalizeStorageDownloadError,
  finalizeStorageErrorToDocumentCaptureCode,
  type FinalizeStorageErrorCode,
} from "@/lib/document-capture/finalize-storage-errors";
import { releaseEphemeralSha256Slot } from "@/lib/document-capture/discard-ephemeral-capture.server";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { prepareCaptureBytesForOcr } from "@/lib/document-capture/prepare-capture-bytes-for-ocr.server";
import { sha256Hex } from "@/lib/document-capture/sha256.server";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type FinalizeCaptureResult = {
  ok: true;
  id: string;
  status?: string;
  duplicateOf?: string | null;
  finalizedAt?: string | null;
};

export type FinalizeCaptureStorageFailure = {
  ok: false;
  code: FinalizeStorageErrorCode;
  message: string;
  isPolicyError: boolean;
  storagePath: string;
  bucket: string;
};

export async function finalizeDocumentCaptureInTransaction(input: {
  captureId: string;
  storagePath: string;
}): Promise<FinalizeCaptureResult | FinalizeCaptureStorageFailure> {
  const bucket = STORAGE_BUCKETS.documentCapture;
  const sb = await createSupabaseServerUserClient();

  const { data: fileData, error: downloadError } = await sb.storage
    .from(bucket)
    .download(input.storagePath);

  if (downloadError || !fileData) {
    const classified = classifyFinalizeStorageDownloadError(downloadError, Boolean(fileData), bucket);
    // #region agent log
    fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
      body: JSON.stringify({
        sessionId: "bd086a",
        hypothesisId: "A",
        location: "finalize-transaction.server.ts:download",
        message: "storage download failed",
        data: {
          captureId: input.captureId,
          code: classified.code,
          storagePath: input.storagePath,
          hasFileData: Boolean(fileData),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      ok: false,
      code: classified.code,
      message: classified.message,
      isPolicyError: classified.isPolicyError,
      storagePath: input.storagePath,
      bucket,
    };
  }

  let bytes: Uint8Array = new Uint8Array(await fileData.arrayBuffer());
  if (bytes.byteLength > DOCUMENT_CAPTURE_MAX_BYTES) {
    throw new Error("File troppo grande");
  }

  const fileName = input.storagePath.split("/").pop() ?? "document";
  let mime = normalizeCaptureMime({
    mime: fileData.type,
    fileName,
    bytes,
  });
  if (!isAllowedCaptureMime(mime)) {
    // #region agent log
    fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
      body: JSON.stringify({
        sessionId: "bd086a",
        hypothesisId: "B",
        location: "finalize-transaction.server.ts:mime",
        message: "mime not allowed",
        data: { captureId: input.captureId, mime, fileName },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new Error("Tipo file non consentito");
  }
  if (mime === "image/svg+xml") {
    throw new Error("SVG non consentito");
  }

  if (needsCaptureOfficeConversion(mime)) {
    try {
      const prepared = await prepareCaptureBytesForOcr({ bytes, mime, fileName });
      bytes = prepared.bytes;
      mime = prepared.mime;
    } catch (officeErr) {
      // #region agent log
      fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
        body: JSON.stringify({
          sessionId: "bd086a",
          hypothesisId: "C",
          location: "finalize-transaction.server.ts:office",
          message: "office conversion failed",
          data: {
            captureId: input.captureId,
            mime,
            error: officeErr instanceof Error ? officeErr.message : String(officeErr),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw officeErr;
    }
    if (bytes.byteLength > DOCUMENT_CAPTURE_MAX_BYTES) {
      throw new Error("File convertito troppo grande");
    }
    const { error: reuploadError } = await sb.storage.from(bucket).upload(input.storagePath, bytes, {
      upsert: true,
      contentType: mime,
    });
    if (reuploadError) {
      throw new Error(reuploadError.message);
    }
  }

  const sha256 = sha256Hex(bytes);

  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (userId) {
    await releaseEphemeralSha256Slot({
      userId,
      sha256,
      keepCaptureId: input.captureId,
    });
  }

  const { data, error } = await sb.rpc("document_capture_finalize", {
    p_capture_id: input.captureId,
    p_sha256: sha256,
    p_mime: mime,
    p_file_size_bytes: bytes.byteLength,
    p_storage_version: "1",
    p_storage_etag: sha256.slice(0, 32),
  });

  if (error) {
    // #region agent log
    fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
      body: JSON.stringify({
        sessionId: "bd086a",
        hypothesisId: "D",
        location: "finalize-transaction.server.ts:rpc",
        message: "document_capture_finalize rpc failed",
        data: {
          captureId: input.captureId,
          rpcMessage: error.message,
          rpcCode: error.code,
          mime,
          byteLength: bytes.byteLength,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

export { finalizeStorageErrorToDocumentCaptureCode };
