import "server-only";

import {
  analyzeDocumentCaptureV41,
  type AnalyzeCaptureV41Result,
} from "@/lib/document-capture/pipeline/analyze-capture-v41.server";
import { createAnalyzeStreamListener } from "@/lib/document-capture/pipeline/analyze-stream-writer.server";
import type { CaptureAnalyzeStreamEvent } from "@/lib/document-capture/pipeline/analyze-stream-events";
import {
  finalizeCaptureFromBytes,
  type FinalizeCaptureResult,
  type FinalizeCaptureStorageFailure,
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
}): Promise<ProcessDocumentCaptureResult> {
  const sb = await createSupabaseServerUserClient();
  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, status")
    .eq("id", input.captureId)
    .maybeSingle();

  if (error || !capture?.storage_path) {
    return { ok: false, code: "not_finalized", message: "Documento non disponibile." };
  }

  const { data: fileData, error: dlError } = await sb.storage
    .from(STORAGE_BUCKETS.documentCapture)
    .download(capture.storage_path);

  if (dlError || !fileData) {
    const classified = classifyStorageDownloadError(
      dlError,
      Boolean(fileData),
      STORAGE_BUCKETS.documentCapture,
      "process documento",
    );
    return { ok: false, code: "storage", message: classified.message };
  }

  let bytes = new Uint8Array(await fileData.arrayBuffer());
  const fileName = capture.storage_path.split("/").pop() ?? "document";
  let mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName,
    bytes,
  });

  let finalizeResult: FinalizeCaptureResult | FinalizeCaptureStorageFailure;
  if (!capture.finalized_at) {
    const finalized = await finalizeCaptureFromBytes({
      captureId: input.captureId,
      storagePath: capture.storage_path,
      bytes,
      mime,
      fileName,
      reuploadConverted: true,
    });
    if ("ok" in finalized && finalized.ok === false) {
      return { ok: false, code: "finalize_failed", message: finalized.message };
    }
    const prepared = finalized as Awaited<ReturnType<typeof finalizeCaptureFromBytes>> & {
      result: FinalizeCaptureResult;
    };
    finalizeResult = prepared.result;
    bytes = prepared.bytes;
    mime = prepared.mime;
  } else {
    finalizeResult = {
      ok: true,
      id: capture.id,
      status: capture.status ?? undefined,
    };
  }

  const stream = input.onStreamEvent ? createAnalyzeStreamListener(input.onStreamEvent) : null;
  const analyze = await analyzeDocumentCaptureV41(input.captureId, input.userId, {
    correlationId: input.correlationId,
    bytes,
    mime,
    onPhase: stream?.listener,
  });
  stream?.stopHeartbeat();

  if (!analyze.ok) {
    return analyze;
  }

  return { ...analyze, finalize: finalizeResult };
}
