import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildReportAIContextForPeriod } from "@/lib/report/ai-context/build-report-ai-context-for-period";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import { resolveReportV2NarrativeEnabled } from "@/lib/feature-flags/report-v2-flag";
import { generateNarrativeFromAiContext } from "@/lib/report/narrative/builders/generate-narrative-from-ai-context";
import {
  emitNarrativeGenerationTelemetry,
  emitNarrativeConsumedTelemetry,
} from "@/lib/report/narrative/observability/emit-narrative-observability";
import { generatedNarrativeDtoSchema } from "@/lib/report/narrative/narrative-schema";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { resolveNarrativeTenantContext } from "@/lib/report/narrative/services/resolve-narrative-tenant-context";
import type { GeneratedNarrativeDto } from "@/lib/report/narrative/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

function narrativeErrorStatus(
  code: string,
): 401 | 403 | 404 | 422 | 429 | 502 | 503 | 504 {
  switch (code) {
    case "rate_limited":
      return 429;
    case "not_configured":
      return 503;
    case "timeout":
      return 504;
    case "validation_failed":
    case "quality_failed":
      return 422;
    case "generation_failed":
      return 502;
    default:
      return 502;
  }
}

export async function handleReportNarrativeGet(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }

  const tenantResult = await resolveNarrativeTenantContext();
  if (!tenantResult.ok) {
    return NextResponse.json({ error: "Sessione non valida", correlationId }, { status: 401 });
  }

  if (!resolveReportV2NarrativeEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const t0 = Date.now();
  const { aiContext, insightsMetadata } = await buildReportAIContextForPeriod(period);

  const result = await generateNarrativeFromAiContext(
    aiContext,
    { userId: tenantResult.userId, companyId: tenantResult.companyId },
  );

  const latencyMs = Date.now() - t0;

  if (!result.ok) {
    emitNarrativeGenerationTelemetry({
      correlationId,
      outcome: "failed",
      code: result.code,
      latencyMs,
      tenantResolved: tenantResult.tenantResolved,
    });
    return NextResponse.json(
      { error: result.code, message: result.message, correlationId },
      { status: narrativeErrorStatus(result.code) },
    );
  }

  const data: GeneratedNarrativeDto = generatedNarrativeDtoSchema.parse(result.data);

  emitNarrativeGenerationTelemetry({
    correlationId,
    outcome: "completed",
    latencyMs,
    tenantResolved: tenantResult.tenantResolved,
  });

  const payload: ReportPayload<GeneratedNarrativeDto> = {
    metadata: {
      ...insightsMetadata,
      source: "narrative-v2",
      correlationId,
    },
    data,
  };
  assertValidReportPayload(payload);

  return NextResponse.json(payload);
}

export async function handleReportNarrativeConsumedPost(request: Request): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const tenantResult = await resolveNarrativeTenantContext();
  if (!tenantResult.ok) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  if (!resolveReportV2NarrativeEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let body: { correlationId?: string; dedupeKey?: string };
  try {
    body = (await request.json()) as { correlationId?: string; dedupeKey?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  if (!body.correlationId || !body.dedupeKey) {
    return NextResponse.json({ error: "correlationId e dedupeKey richiesti" }, { status: 400 });
  }

  emitNarrativeConsumedTelemetry({
    correlationId: body.correlationId,
    dedupeKey: body.dedupeKey,
    tenantResolved: tenantResult.tenantResolved,
  });

  return NextResponse.json({ ok: true });
}
