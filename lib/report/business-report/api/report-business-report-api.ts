import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import { resolveBusinessReportEnabled } from "@/lib/feature-flags/report-v2-flag";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { generateBusinessReport } from "@/lib/report/business-report/pipeline/generate-business-report";
import { hydrateBusinessReportForDisplay } from "@/lib/report/business-report/merge/build-deterministic-executive-summary";
import { resolveBusinessReportType } from "@/lib/report/business-report/period/resolve-business-report-period";
import type { BusinessReport, BusinessReportType } from "@/lib/report/business-report/types";
import {
  getReportRunById,
  listGenerationsForLogicalReport,
  listReportRunHistory,
} from "@/lib/report/business-report/storage/report-run-storage.server";
import { isBusinessReportRateLimited } from "@/lib/report/business-report/services/business-report-rate-limit.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";

function buildBusinessReportMetadata(correlationId: string): ReportMetadataEnvelope {
  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceFreshness: "LIVE",
    trustStatus: "GREEN",
    dataWarnings: [`correlationId:${correlationId}`],
  };
}

function parseReportType(raw: string | null): BusinessReportType | null {
  if (raw === "weekly" || raw === "monthly" || raw === "custom") return raw;
  return null;
}

export async function handleBusinessReportGet(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }
  if (!resolveBusinessReportEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const runId = params.get("runId");
  if (runId) {
    const row = await getReportRunById(runId);
    if (!row?.content) {
      return NextResponse.json({ error: "not_found", correlationId }, { status: 404 });
    }
    const payload: ReportPayload<BusinessReport> = {
      metadata: buildBusinessReportMetadata(correlationId),
      data: hydrateBusinessReportForDisplay(row.content),
    };
    assertValidReportPayload(payload);
    return NextResponse.json(payload);
  }

  const period = parseRequestedPeriod(params);
  const reportType = parseReportType(params.get("reportType")) ?? resolveBusinessReportType(period.preset);
  const result = await generateBusinessReport({ reportType, period });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message, runId: result.runId, correlationId },
      { status: result.code === "already_running" ? 409 : 502 },
    );
  }

  const payload: ReportPayload<BusinessReport> = {
    metadata: buildBusinessReportMetadata(correlationId),
    data: hydrateBusinessReportForDisplay(result.report),
  };
  assertValidReportPayload(payload);
  return NextResponse.json({ ...payload, cached: result.cached });
}

export async function handleBusinessReportGeneratePost(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }
  if (!resolveBusinessReportEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await getServerSession();
  const userId = session.user?.id?.trim() ?? "anonymous";
  let body: { reportType?: BusinessReportType; regenerate?: boolean; period?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* query fallback */
  }

  const params = new URL(request.url).searchParams;
  const period = parseRequestedPeriod(params);
  const reportType = body.reportType ?? parseReportType(params.get("reportType")) ?? resolveBusinessReportType(period.preset);
  const regenerate = Boolean(body.regenerate ?? params.get("regenerate") === "true");

  if (await isBusinessReportRateLimited(userId, regenerate)) {
    return NextResponse.json({ error: "rate_limited", correlationId }, { status: 429 });
  }

  const result = await generateBusinessReport({ reportType, period, regenerate });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message, runId: result.runId, correlationId },
      { status: result.code === "already_running" ? 409 : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    runId: result.runId,
    cached: result.cached,
    ephemeral: result.ephemeral ?? false,
    report: hydrateBusinessReportForDisplay(result.report),
    correlationId,
  });
}

export async function handleBusinessReportHistoryGet(request: Request): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }
  if (!resolveBusinessReportEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const logicalKey = new URL(request.url).searchParams.get("logicalReportKey");
  if (logicalKey) {
    const generations = await listGenerationsForLogicalReport(logicalKey);
    return NextResponse.json({ generations });
  }

  const history = await listReportRunHistory();
  return NextResponse.json({ history });
}
