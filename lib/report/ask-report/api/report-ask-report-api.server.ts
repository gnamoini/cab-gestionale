import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runAskReportLoop } from "@/lib/report/ask-report/loop/run-ask-report-loop.server";
import { isAskReportRateLimited } from "@/lib/report/ask-report/services/ask-report-rate-limit.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { getServerSession } from "@/src/lib/auth/get-server-session";

const askReportRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
  conversationContext: z
    .object({
      period: z.object({
        preset: z.string(),
        start: z.string(),
        end: z.string(),
        compareMode: z.string(),
      }),
      compareMode: z.string(),
      metricId: z.string().optional(),
      entity: z.object({ type: z.string(), id: z.string() }).optional(),
    })
    .optional(),
  period: z
    .object({
      preset: z.string(),
      start: z.string(),
      end: z.string(),
      compareMode: z.string(),
    })
    .optional(),
  compareMode: z.string().optional(),
  uiContext: z
    .object({
      activeSection: z.string().optional(),
      focusedMetricId: z.string().optional(),
      focusedEntity: z.object({ type: z.string(), id: z.string() }).optional(),
    })
    .optional(),
});

export async function handleAskReportPost(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  const t0 = Date.now();

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", requestId }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized", requestId }, { status: 401 });
  }

  if (await isAskReportRateLimited(userId)) {
    return NextResponse.json({ error: "rate_limited", requestId }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", requestId }, { status: 400 });
  }

  const parsed = askReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", requestId }, { status: 400 });
  }

  try {
    const response = await runAskReportLoop({ request: parsed.data as import("@/lib/report/ask-report/types").AskReportRequest, userId });
    console.info("[ask-report]", {
      requestId,
      conversationId: response.conversationId,
      intent: response.planMode,
      toolRounds: response.toolActivity?.length ?? 0,
      durationMs: Date.now() - t0,
      status: response.status,
      validationStatus: response.status,
    });
    return NextResponse.json({ ...response, requestId });
  } catch (e) {
    console.error("[ask-report] error", requestId, e);
    return NextResponse.json(
      { error: "failed", message: "Non riesco a formulare una risposta affidabile in questo momento.", requestId },
      { status: 502 },
    );
  }
}
