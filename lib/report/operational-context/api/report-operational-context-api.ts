import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { buildReportOperationalContext } from "@/lib/report/operational-context/build-report-operational-context.server";

export async function handleOperationalContextGet(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato", correlationId }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const period = parseRequestedPeriod(params);
  const viewRaw = params.get("view");
  const view =
    viewRaw === "summary" || viewRaw === "timeline" || viewRaw === "full" ? viewRaw : "full";
  const cursor = params.get("cursor");
  const limitRaw = params.get("limit");
  const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw) || 20)) : 20;

  const data = await buildReportOperationalContext({
    period,
    view,
    cursor,
    limit,
  });

  return NextResponse.json({ data, correlationId });
}
