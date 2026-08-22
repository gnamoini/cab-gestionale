import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { buildDecisionCenterContext } from "@/lib/report/decision-center/context/build-decision-center-context.server";
import {
  buildDecisionCandidates,
  businessReportDecisionToCandidate,
} from "@/lib/report/decision-center/engine/build-decision-candidates.server";
import { mergeCandidatesWithPersistence } from "@/lib/report/decision-center/engine/merge-decision-with-persistence";
import {
  getDecisionPointById,
  listDecisionPointsForPeriod,
  updateDecisionStatus,
  upsertDecisionCandidates,
} from "@/lib/report/decision-center/storage/decision-point-storage.server";
import { DECISION_SCHEMA_VERSION } from "@/lib/report/decision-center/versions";
import type { DecisionCenterDto, DecisionStatus } from "@/lib/report/decision-center/types";
import { assertDecisionStatusTransition } from "@/lib/report/decision-center/state/decision-status-transitions";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import { findLatestCompletedRun } from "@/lib/report/business-report/storage/report-run-storage.server";
import { buildLogicalReportKey } from "@/lib/report/business-report/idempotency/report-run-keys";
import { resolveBusinessReportType } from "@/lib/report/business-report/period/resolve-business-report-period";

function buildMetadata(correlationId: string) {
  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceFreshness: "LIVE" as const,
    trustStatus: "GREEN" as const,
    dataWarnings: [`correlationId:${correlationId}`],
  };
}

export async function handleDecisionCenterGet(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const ctx = await buildDecisionCenterContext(period);
  let candidates = buildDecisionCandidates(ctx);

  const reportType = resolveBusinessReportType(period.preset);
  const logicalKey = buildLogicalReportKey({
    reportType,
    periodStart: period.start,
    periodEnd: period.end,
    compareMode: period.compareMode,
  });
  const latestRun = await findLatestCompletedRun(logicalKey);
  if (latestRun?.content?.decisions?.length) {
    for (const d of latestRun.content.decisions) {
      const c = businessReportDecisionToCandidate(d, ctx, latestRun.id);
      if (c) candidates.push(c);
    }
  }

  await upsertDecisionCandidates({
    periodFrom: period.start,
    periodTo: period.end,
    compareMode: period.compareMode,
    candidates,
  });

  const persisted = await listDecisionPointsForPeriod({
    periodFrom: period.start,
    periodTo: period.end,
    compareMode: period.compareMode,
  });

  const decisions = mergeCandidatesWithPersistence(candidates, persisted);
  const data: DecisionCenterDto = {
    contractVersion: DECISION_SCHEMA_VERSION,
    decisions,
    aiStatus: decisions.some((d) => d.aiStatus === "completed") ? "completed" : "idle",
    generatedAt: new Date().toISOString(),
  };

  const payload: ReportPayload<DecisionCenterDto> = { metadata: buildMetadata(correlationId), data };
  assertValidReportPayload(payload);
  return NextResponse.json(payload);
}

export async function handleDecisionCenterPatch(
  request: Request,
  id: string,
): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageWrite("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized", correlationId }, { status: 401 });
  }

  const body = (await request.json()) as { status?: DecisionStatus; conditionHash?: string };
  if (!body.status) {
    return NextResponse.json({ error: "invalid_body", correlationId }, { status: 400 });
  }

  const row = await getDecisionPointById(id);
  if (!row) {
    return NextResponse.json({ error: "not_found", correlationId }, { status: 404 });
  }

  try {
    assertDecisionStatusTransition(row.status, body.status);
  } catch {
    return NextResponse.json({ error: "invalid_transition", correlationId }, { status: 409 });
  }

  const updated = await updateDecisionStatus({
    id,
    status: body.status,
    userId,
    dismissedConditionHash: body.status === "dismissed" ? body.conditionHash : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "update_failed", correlationId }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id, status: updated.status, correlationId });
}
