import { NextResponse } from "next/server";
import { buildCaptureDryRunApplication } from "@/lib/document-capture/capture-apply.server";
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
    const rate = await checkDocumentCaptureRateLimit(userId, "dry_run");
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Troppi dry-run, riprova tra poco", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }
  }

  const t0 = performance.now();
  try {
    const result = await buildCaptureDryRunApplication(id);
    traceDocumentCaptureOperation({
      operation: "dry-run",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json(result);
  } catch (e) {
    traceDocumentCaptureOperation({
      operation: "dry-run",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode: "PLAN_STALE",
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dry-run fallito" },
      { status: 400 },
    );
  }
}
