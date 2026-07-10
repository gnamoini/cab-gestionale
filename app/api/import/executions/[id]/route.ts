import { NextResponse } from "next/server";
import {
  getImportExecutionResponse,
  processQueuedImportExecution,
} from "@/lib/import-core/import-run.server";
import {
  importCorrelationHeaders,
  importErrorJson,
  resolveRequestCorrelationId,
  withImportCorrelation,
} from "@/lib/import-core/import-http.server";
import { scheduleExecutionRetry } from "@/lib/import-core/import-executions.server";
import { getImportExecution } from "@/lib/import-core/import-executions.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(_request);
  const session = await getServerSession();
  if (!session.user?.id) return importErrorJson("PERMISSION_DENIED", correlationId, 401);

  const { id } = await context.params;
  const row = await getImportExecutionResponse(id);
  if (!row) return importErrorJson("EXECUTION_NOT_FOUND", correlationId, 404);

  return NextResponse.json(withImportCorrelation(correlationId, row), {
    headers: importCorrelationHeaders(correlationId),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(request);
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return importErrorJson("PERMISSION_DENIED", correlationId, 401);

  const { id } = await context.params;
  try {
    const result = await processQueuedImportExecution({ executionId: id, userId });
    return NextResponse.json(withImportCorrelation(correlationId, result), {
      headers: importCorrelationHeaders(correlationId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Elaborazione fallita";
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: message, code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }
}
