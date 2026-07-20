import "server-only";

import { NextResponse } from "next/server";
import {
  parseRequestedPeriod,
} from "@/lib/report/datasets/api/report-dataset-api";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import { loadCrossDtoForPeriod } from "@/lib/report/cross-analysis/api/load-cross-dto-for-period";
import { CROSS_CONTRACT_VERSION, type CrossPayloadData } from "@/lib/report/cross-analysis/types";
import { resolveReportV2DomainDtoEnabled } from "@/lib/feature-flags/report-v2-flag";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export async function handleReportCrossAnalysisGet(request: Request): Promise<NextResponse> {
  if (!resolveReportV2DomainDtoEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const t0 = Date.now();
  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const cross = await loadCrossDtoForPeriod(period);

  const payload: ReportPayload<CrossPayloadData> = {
    metadata: cross.metadata,
    data: {
      contractVersion: CROSS_CONTRACT_VERSION,
      metrics: cross.metrics,
    },
  };
  assertValidReportPayload(payload);

  reportMetricObserver.emit("cross_payload_generated", {
    consumer: "cross-analysis",
    metricId: "cross-analysis",
    metricIds: cross.metrics.map((m) => m.metricId),
    executionTimeMs: Date.now() - t0,
    cardCount: cross.metrics.length,
  });

  return NextResponse.json(payload);
}
