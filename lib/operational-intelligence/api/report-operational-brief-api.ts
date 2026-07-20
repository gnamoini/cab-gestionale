import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import { resolveOperationalBriefEnabled } from "@/lib/feature-flags/report-v2-flag";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { buildOperationalBriefPipeline } from "@/lib/operational-intelligence/brief/build-operational-brief-pipeline";
import { operationalBriefOutputSchema } from "@/lib/operational-intelligence/brief/operational-brief-schema";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import {
  getPreviousPeriodBrief,
  listOperationalBriefHistory,
  listOperationalPeriods,
} from "@/lib/operational-intelligence/storage/operational-brief-storage.server";
import { formatOperationalBriefPlainText } from "@/lib/operational-intelligence/pdf/format-operational-brief-plain-text";
import { runOperationalAssistant } from "@/lib/operational-intelligence/assistant/operational-brief-assistant";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

function briefErrorStatus(code: string): 401 | 403 | 404 | 422 | 429 | 502 | 503 | 504 {
  if (code === "rate_limited") return 429;
  if (code === "not_configured") return 503;
  if (code === "timeout") return 504;
  if (code === "validation_failed") return 422;
  return 502;
}

export async function handleOperationalBriefGet(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }

  if (!resolveOperationalBriefEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);

  try {
    const { brief, insightsMetadata } = await buildOperationalBriefPipeline(period);
    const data: OperationalBriefOutput = operationalBriefOutputSchema.parse(brief) as OperationalBriefOutput;

    const payload: ReportPayload<OperationalBriefOutput> = {
      metadata: { ...insightsMetadata, source: "operational-brief", correlationId },
      data,
    };
    assertValidReportPayload(payload);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generazione brief fallita";
    const code = message.startsWith("not_configured") ? "not_configured" : "generation_failed";
    return NextResponse.json({ error: code, message, correlationId }, { status: briefErrorStatus(code) });
  }
}

export async function handleOperationalBriefHistoryGet(request: Request): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const periodId = params.get("periodId");
  if (periodId) {
    const history = await listOperationalBriefHistory(periodId);
    return NextResponse.json({ periods: [], history });
  }

  const periods = await listOperationalPeriods();
  return NextResponse.json({ periods, history: [] });
}

export async function handleOperationalBriefPdfGet(request: Request): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  if (!resolveOperationalBriefEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const { brief } = await buildOperationalBriefPipeline(period);
  const text = formatOperationalBriefPlainText(brief);

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="brief-operativo-${brief.period.startDate}.txt"`,
    },
  });
}

export async function handleOperationalAssistantPost(request: Request): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  if (!resolveOperationalBriefEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let body: { question?: string; periodPreset?: string };
  try {
    body = (await request.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Domanda richiesta" }, { status: 400 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const { brief } = await buildOperationalBriefPipeline(period);
  const previousBrief = await getPreviousPeriodBrief(brief.period.previousPeriodId);
  const result = runOperationalAssistant({ question: body.question, brief, previousBrief });

  return NextResponse.json(result);
}
