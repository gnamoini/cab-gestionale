import { NextResponse } from "next/server";
import { parseRequestedPeriod } from "@/lib/report/datasets/api/report-dataset-api";
import { runDrilldownServer, DrilldownAccessError } from "@/lib/report/drilldown/run-drilldown.server";
import type { ReportDrillDownRequest } from "@/lib/report/drilldown/types";
import {
  DrilldownValidationError,
  parseDrilldownRequestFromSearchParams,
  validateDrilldownRequest,
} from "@/lib/report/drilldown/validate-drilldown-request.server";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const period = parseRequestedPeriod(url.searchParams);
  try {
    const draft = parseDrilldownRequestFromSearchParams(url.searchParams, period);
    const validated = validateDrilldownRequest(draft);
    const data = await runDrilldownServer(validated);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DrilldownValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DrilldownAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ReportDrillDownRequest;
    const validated = validateDrilldownRequest(body);
    const data = await runDrilldownServer(validated);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DrilldownValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DrilldownAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
