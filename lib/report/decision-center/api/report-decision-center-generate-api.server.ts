import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { buildDecisionCenterContext } from "@/lib/report/decision-center/context/build-decision-center-context.server";
import { buildDecisionCandidates } from "@/lib/report/decision-center/engine/build-decision-candidates.server";
import { upsertDecisionCandidates } from "@/lib/report/decision-center/storage/decision-point-storage.server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

/** AI wording generation — deterministic fallback when provider unavailable (C5). */
export async function handleDecisionCenterGeneratePost(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageWrite("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const ctx = await buildDecisionCenterContext(period);
  const candidates = buildDecisionCandidates(ctx);

  await upsertDecisionCandidates({
    periodFrom: period.start,
    periodTo: period.end,
    compareMode: period.compareMode,
    candidates,
  });

  return NextResponse.json({
    aiStatus: "unavailable" as const,
    message: "AI interpretation unavailable — deterministic candidates persisted.",
    correlationId,
  });
}
