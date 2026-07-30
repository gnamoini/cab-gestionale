import "server-only";

import {
  analyzeDocumentCaptureV41,
  type AnalyzeCaptureV41Result,
} from "@/lib/document-capture/pipeline/analyze-capture-v41.server";
import { createAnalyzeStreamListener } from "@/lib/document-capture/pipeline/analyze-stream-writer.server";
import type { CaptureAnalyzeStreamEvent } from "@/lib/document-capture/pipeline/analyze-stream-events";
import { createAnalyzeTrace } from "@/lib/document-capture/pipeline/analyze-trace.server";
import {
  finalizeCaptureFromBytes,
  type FinalizeCaptureResult,
} from "@/lib/document-capture/finalize-transaction.server";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type ProcessDocumentCaptureResult =
  | (AnalyzeCaptureV41Result & {
      finalize: FinalizeCaptureResult;
    })
  | {
      ok: false;
      code: "not_finalized" | "storage" | "finalize_failed";
      message: string;
      finalize?: FinalizeCaptureResult;
    };

export async function processDocumentCapture(input: {
  captureId: string;
  userId: string;
  correlationId?: string;
  onStreamEvent?: (event: CaptureAnalyzeStreamEvent) => void;
  uploadDurationMs?: number;
}): Promise<ProcessDocumentCaptureResult> {
  const sb = await createSupabaseServerUserClient();
  const stream = input.onStreamEvent ? createAnalyzeStreamListener(input.onStreamEvent) : null;
  const trace = createAnalyzeTrace({
    captureId: input.captureId,
    correlationId: input.correlationId,
    companyId: null,
    pipelineVersion: "v4.1",
    onPhase: stream?.listener,
  });
  trace.emit("START", "ok");
  if (input.uploadDurationMs != null) {
    trace.emit("UPLOAD_OK", "ok", { durationMs: input.uploadDurationMs });
  }

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, status")
    .eq("id", input.captureId)
    .maybeSingle();

  if (error || !capture?.storage_path) {
    return { ok: false, code: "not_finalized", message: "Documento non disponibile." };
  }

  trace.emit("DOWNLOAD_STORAGE_START", "ok", {
    storagePath: capture.storage_path,
    companyId: capture.company_id,
  });

  const { data: fileData, error: dlError } = await sb.storage
    .from(STORAGE_BUCKETS.documentCapture)
    .download(capture.storage_path);

  if (dlError || !fileData) {
    const classified = classifyStorageDownloadError(
      dlError,
      Boolean(fileData),
      STORAGE_BUCKETS.documentCapture,
      "analisi documento",
    );
    trace.fail("DOWNLOAD_STORAGE_FAIL", dlError ?? new Error(classified.message));
    return { ok: false, code: "storage", message: classified.message };
  }

  let bytes = new Uint8Array(await fileData.arrayBuffer());
  const fileName = capture.storage_path.split("/").pop() ?? "document";
  let mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName,
    bytes,
  });

  trace.emit("DOWNLOAD_STORAGE_OK", "ok", {
    fileMime: mime,
    fileSize: bytes.byteLength,
    storagePath: capture.storage_path,
  });

  let finalizeResult: FinalizeCaptureResult;
  if (!capture.finalized_at) {
    trace.emit("FINALIZE_START", "ok");
    const finalized = await finalizeCaptureFromBytes({
      captureId: input.captureId,
      storagePath: capture.storage_path,
      bytes,
      mime,
      fileName,
      reuploadConverted: true,
    });
    if ("ok" in finalized && finalized.ok === false) {
      trace.emit("FINALIZE_FAIL", "fail", { detail: finalized.message });
      return { ok: false, code: "finalize_failed", message: finalized.message };
    }
    if ("result" in finalized) {
      finalizeResult = finalized.result;
      bytes = new Uint8Array(finalized.bytes);
      mime = finalized.mime;
      trace.emit("FINALIZE_OK", "ok", { fileMime: mime, fileSize: bytes.byteLength });
    } else {
      trace.emit("FINALIZE_FAIL", "fail", { detail: "Finalizzazione non completata." });
      return { ok: false, code: "finalize_failed", message: "Finalizzazione non completata." };
    }
  } else {
    finalizeResult = {
      ok: true,
      id: capture.id,
      status: capture.status ?? undefined,
    };
  }

  const analyze = await analyzeDocumentCaptureV41(input.captureId, input.userId, {
    correlationId: input.correlationId,
    bytes,
    mime,
    trace,
  });
  stream?.stopHeartbeat();

  const finalizedCapture = finalizeResult;
  if (!analyze.ok) {
    return { ...analyze, finalize: finalizedCapture };
  }

  return { ...analyze, finalize: finalizedCapture };
}
