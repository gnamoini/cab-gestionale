import { NextResponse } from "next/server";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { checkDocumentCaptureRateLimit } from "@/lib/document-capture/document-capture-rate-limit.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { processDocumentCapture } from "@/lib/document-capture/pipeline/process-capture.server";
import {
  CAPTURE_ANALYZE_NDJSON_ACCEPT,
  type CaptureAnalyzeStreamEvent,
} from "@/lib/document-capture/pipeline/analyze-stream-events";
import { encodeAnalyzeNdjsonLine } from "@/lib/document-capture/pipeline/analyze-stream-writer.server";
import { importCorrelationHeaders, resolveRequestCorrelationId, withImportCorrelation } from "@/lib/import-core/import-http.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(request);
  const authError = await requireDocumentCaptureAuth("write");
  if (authError) return authError;

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const userId = (await sb.auth.getUser()).data.user?.id;
  const companyId = await getCompanyIdForUserOrNull();

  if (userId) {
    const rate = await checkDocumentCaptureRateLimit(userId, "analyze");
    if (!rate.ok) {
      return NextResponse.json(
        withImportCorrelation(correlationId, { error: "Troppe analisi, riprova tra poco", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...importCorrelationHeaders(correlationId), "Retry-After": String(rate.retryAfterSec) } },
      );
    }
  }

  const wantsStream = request.headers.get("accept")?.includes(CAPTURE_ANALYZE_NDJSON_ACCEPT);
  const uploadDurationHeader = request.headers.get("x-capture-upload-duration-ms");
  const uploadDurationMs = uploadDurationHeader ? Number(uploadDurationHeader) : undefined;
  const t0 = performance.now();
  let timeToFirstProgressMs: number | undefined;

  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const push = (event: CaptureAnalyzeStreamEvent) => {
          if (event.type === "phase" && timeToFirstProgressMs == null) {
            timeToFirstProgressMs = Math.round(performance.now() - t0);
          }
          controller.enqueue(encoder.encode(encodeAnalyzeNdjsonLine(event)));
        };

        void processDocumentCapture({
          captureId: id,
          userId: userId ?? "system",
          correlationId,
          uploadDurationMs: Number.isFinite(uploadDurationMs) ? uploadDurationMs : undefined,
          onStreamEvent: push,
        })
          .then((result) => {
            push({ type: "result", ok: "ok" in result ? result.ok : false, body: result as Record<string, unknown> });
            controller.close();
            traceDocumentCaptureOperation({
              operation: "process",
              captureId: id,
              userId,
              companyId,
              durationMs: Math.round(performance.now() - t0),
              timeToFirstProgressMs,
              timeToReviewReadyMs: result.ok ? Math.round(performance.now() - t0) : undefined,
              outcome: result.ok ? "ok" : "error",
            });
          })
          .catch((e) => {
            const message = e instanceof Error ? e.message : "Process non riuscito";
            push({ type: "result", ok: false, body: { ok: false, message } });
            controller.close();
            traceDocumentCaptureOperation({
              operation: "process",
              captureId: id,
              userId,
              companyId,
              durationMs: Math.round(performance.now() - t0),
              outcome: "error",
            });
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": CAPTURE_ANALYZE_NDJSON_ACCEPT,
        "Cache-Control": "no-transform",
        ...importCorrelationHeaders(correlationId),
      },
    });
  }

  const result = await processDocumentCapture({
    captureId: id,
    userId: userId ?? "system",
    correlationId,
    uploadDurationMs: Number.isFinite(uploadDurationMs) ? uploadDurationMs : undefined,
  });

  traceDocumentCaptureOperation({
    operation: "process",
    captureId: id,
    userId,
    companyId,
    durationMs: Math.round(performance.now() - t0),
    timeToReviewReadyMs: result.ok ? Math.round(performance.now() - t0) : undefined,
    outcome: result.ok ? "ok" : "error",
  });

  if (!result.ok) {
    return NextResponse.json(withImportCorrelation(correlationId, result), {
      status: result.code === "not_finalized" ? 400 : 500,
      headers: importCorrelationHeaders(correlationId),
    });
  }

  return NextResponse.json(withImportCorrelation(correlationId, result), {
    headers: importCorrelationHeaders(correlationId),
  });
}
