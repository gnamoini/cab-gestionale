import "server-only";

import { NextResponse } from "next/server";
import { buildReportAnalytics } from "@/lib/report/analytics-engine/build-report-analytics";
import { buildAnalyticsMetadataEnvelope } from "@/lib/report/analytics-engine/build-analytics-metadata-envelope";
import { parseAnalyticsQueryFromSearchParams } from "@/lib/report/analytics-engine/parse-analytics-query";
import { AnalyticsMetricValidationError } from "@/lib/report/analytics-engine/validate-metric-ids";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export async function handleReportAnalyticsGet(request: Request): Promise<NextResponse> {
  return handleReportAnalyticsRequest(request, new URL(request.url).searchParams);
}

export async function handleReportAnalyticsPost(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as Partial<import("@/lib/report/analytics-engine/types").ReportAnalyticsQuery>;
  const params = new URLSearchParams();
  if (body.period?.preset) params.set("preset", body.period.preset);
  if (body.period?.start) params.set("from", body.period.start);
  if (body.period?.end) params.set("to", body.period.end);
  if (body.compareMode) params.set("compareMode", body.compareMode);
  if (body.granularity) params.set("granularity", body.granularity);
  if (body.includeSeries) params.set("includeSeries", "true");
  if (body.metricIds?.length) params.set("metrics", body.metricIds.join(","));
  if (body.dimensions?.length) params.set("dimensions", body.dimensions.join(","));
  return handleReportAnalyticsRequest(request, params);
}

async function handleReportAnalyticsRequest(
  _request: Request,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  try {
    const query = parseAnalyticsQueryFromSearchParams(searchParams);
    if (query.metricIds.length === 0) {
      return NextResponse.json({ error: "Parametro metrics obbligatorio" }, { status: 400 });
    }
    const { result, bundle } = await buildReportAnalytics(query);

    const payload: ReportPayload<ReportAnalyticsResult> = {
      metadata: buildAnalyticsMetadataEnvelope({ bundle, result }),
      data: result,
    };
    assertValidReportPayload(payload);
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof AnalyticsMetricValidationError) {
      return NextResponse.json({ error: err.message, invalidIds: err.invalidIds }, { status: 400 });
    }
    throw err;
  }
}
