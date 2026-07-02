import { NextResponse } from "next/server";
import { analyzeDocumentCapture } from "@/lib/document-capture/analyze-capture.server";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { checkDocumentCaptureRateLimit } from "@/lib/document-capture/document-capture-rate-limit.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
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
        { error: "Troppe analisi, riprova tra poco", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }
  }

  const t0 = performance.now();
  const result = await analyzeDocumentCapture(id);
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
    const status = result.code === "not_configured" ? 503 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json(result);
}
