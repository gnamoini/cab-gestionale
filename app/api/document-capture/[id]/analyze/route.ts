import { NextResponse } from "next/server";
import { analyzeDocumentCapture } from "@/lib/document-capture/analyze-capture.server";
import { isDocumentCaptureV41Enabled } from "@/lib/document-capture/document-capture-v41.server";
import { analyzeDocumentCaptureV41 } from "@/lib/document-capture/pipeline/analyze-capture-v41.server";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { checkDocumentCaptureRateLimit } from "@/lib/document-capture/document-capture-rate-limit.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { traceDocumentCapturePipelinePath } from "@/lib/import-core/document-capture-path-telemetry.server";
import { importCorrelationHeaders, resolveRequestCorrelationId, withImportCorrelation } from "@/lib/import-core/import-http.server";
import { isGeminiQuotaErrorMessage, parseGeminiRetryAfterSec } from "@/lib/ai/gemini-retry-after";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

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

  traceDocumentCapturePipelinePath({
    correlationId,
    captureId: id,
    operation: "analyze",
    userId,
    companyId,
  });

  const t0 = performance.now();
  const result = isDocumentCaptureV41Enabled()
    ? await analyzeDocumentCaptureV41(id, userId ?? "system")
    : await analyzeDocumentCapture(id);
  traceDocumentCaptureOperation({
    operation: "analyze",
    captureId: id,
    userId,
    companyId,
    durationMs: Math.round(performance.now() - t0),
    outcome: result.ok ? "ok" : "error",
    errorCode: result.ok
      ? undefined
      : result.code === "not_configured"
        ? "NOT_CONFIGURED"
        : "APPLY_FAILED",
  });

  if (!result.ok) {
    const status =
      result.code === "not_configured" || result.code === "unreachable"
        ? 503
        : result.code === "auth_invalid"
          ? 502
          : result.code === "no_fields"
            ? 422
            : 400;
    const headers: Record<string, string> = {
      "X-Correlation-Id": correlationId,
    };
    if (result.code === "failed" && isGeminiQuotaErrorMessage(result.message)) {
      const retrySec = parseGeminiRetryAfterSec(result.message);
      if (retrySec != null) headers["Retry-After"] = String(retrySec);
    }
    return NextResponse.json(
      withImportCorrelation(correlationId, {
        error: result.message,
        code: result.code,
        errorType: "errorType" in result ? result.errorType : undefined,
      }),
      { status, headers },
    );
  }

  return NextResponse.json(withImportCorrelation(correlationId, result), {
    headers: importCorrelationHeaders(correlationId),
  });
}
