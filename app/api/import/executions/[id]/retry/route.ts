import { NextResponse } from "next/server";
import {
  importCorrelationHeaders,
  importErrorJson,
  resolveRequestCorrelationId,
  withImportCorrelation,
} from "@/lib/import-core/import-http.server";
import { getImportExecution, scheduleExecutionRetry } from "@/lib/import-core/import-executions.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(request);
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return importErrorJson("PERMISSION_DENIED", correlationId, 401);

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const execution = await getImportExecution(sb, id);
  if (!execution) return importErrorJson("EXECUTION_NOT_FOUND", correlationId, 404);

  if (execution.status !== "failed") {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Solo execution failed sono retryable", code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }

  const retried = await scheduleExecutionRetry(sb, {
    execution,
    errorCode: execution.errorCode ?? "UNKNOWN",
  });

  return NextResponse.json(
    withImportCorrelation(correlationId, { retried, executionId: id }),
    { headers: importCorrelationHeaders(correlationId) },
  );
}
