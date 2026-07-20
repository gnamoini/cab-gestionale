import "server-only";

import { NextResponse } from "next/server";
import {
  AI_CONTEXT_CONTRACT_VERSION,
  type ReportAIContextPayloadData,
} from "@/lib/report/ai-context/types";
import { buildReportAIContextForPeriod } from "@/lib/report/ai-context/build-report-ai-context-for-period";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import { resolveReportV2AiContextEnabled } from "@/lib/feature-flags/report-v2-flag";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export async function handleReportAiContextGet(request: Request): Promise<NextResponse> {
  if (!resolveReportV2AiContextEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const { aiContext, insightsMetadata } = await buildReportAIContextForPeriod(period);

  const payload: ReportPayload<ReportAIContextPayloadData> = {
    metadata: insightsMetadata,
    data: {
      contractVersion: AI_CONTEXT_CONTRACT_VERSION,
      insights: aiContext.insights,
      trustSummary: aiContext.trustSummary,
    },
  };
  assertValidReportPayload(payload);

  return NextResponse.json(payload);
}
