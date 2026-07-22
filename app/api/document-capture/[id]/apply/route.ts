import { NextResponse } from "next/server";
import {
  applyDocumentCapturePlan,
  CaptureApplyInProgressError,
} from "@/lib/document-capture/capture-apply.server";
import { CapturePlanStaleError } from "@/lib/document-capture/capture-plan-staleness";
import type { CaptureApplyMeta } from "@/lib/document-capture/capture-apply-meta";
import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import { requireDocumentCaptureAuth } from "@/lib/document-capture/document-capture-route-auth.server";
import { checkDocumentCaptureRateLimit } from "@/lib/document-capture/document-capture-rate-limit.server";
import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireDocumentCaptureAuth("write", { editWorkOrders: true });
  if (authError) return authError;

  const { id } = await context.params;
  let body: { applicationId?: string; forceReview?: boolean; applyMeta?: CaptureApplyMeta };
  try {
    body = (await request.json()) as {
      applicationId?: string;
      forceReview?: boolean;
      applyMeta?: CaptureApplyMeta;
    };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId richiesto" }, { status: 400 });
  }

  const sb = await createSupabaseServerUserClient();
  const userId = (await sb.auth.getUser()).data.user?.id;
  const companyId = await getCompanyIdForUserOrNull();
  const t0 = performance.now();

  if (userId) {
    const rate = await checkDocumentCaptureRateLimit(userId, "apply");
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Troppi apply, riprova tra poco", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }
  }

  try {
    const result = await applyDocumentCapturePlan({
      captureId: id,
      applicationId: body.applicationId,
      forceReview: body.forceReview,
      applyMeta: body.applyMeta,
    });
    traceDocumentCaptureOperation({
      operation: "apply",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json(result);
  } catch (e) {
    const errorCode =
      e instanceof CapturePlanStaleError
        ? "PLAN_STALE"
        : e instanceof CaptureApplyInProgressError
          ? "APPLY_IN_PROGRESS"
          : "APPLY_FAILED";

    traceDocumentCaptureOperation({
      operation: "apply",
      captureId: id,
      userId,
      companyId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode,
    });

    if (e instanceof CapturePlanStaleError) {
      return NextResponse.json({ error: e.message, code: "PLAN_STALE" }, { status: 409 });
    }
    if (e instanceof CaptureApplyInProgressError) {
      return NextResponse.json({ error: e.message, code: "APPLY_IN_PROGRESS" }, { status: 409 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Apply fallito", code: "APPLY_FAILED" },
      { status: 400 },
    );
  }
}
