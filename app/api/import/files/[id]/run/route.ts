import { NextResponse } from "next/server";
import {
  assertImportFileAccess,
  runImportFileExecution,
} from "@/lib/import-core/import-run.server";
import type { ImportExecutionFeature } from "@/lib/import-core/types";
import {
  importCorrelationHeaders,
  importErrorJson,
  resolveRequestCorrelationId,
  withImportCorrelation,
} from "@/lib/import-core/import-http.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const FEATURE_BY_KIND: Record<string, ImportExecutionFeature> = {
  ordine_fornitore: "ordine_fornitore",
  listino: "listino_pdf",
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(request);
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return importErrorJson("PERMISSION_DENIED", correlationId, 401);

  const { id: importFileId } = await context.params;
  let body: { feature?: ImportExecutionFeature; async?: boolean; forceReprocess?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const file = await assertImportFileAccess(importFileId, userId);
    const feature = body.feature ?? FEATURE_BY_KIND[file.kind];
    if (!feature) return importErrorJson("AI_PARSE_ERROR", correlationId, 400);

    const result = await runImportFileExecution({
      importFileId,
      feature,
      userId,
      companyId: file.companyId,
      correlationId,
      forceReprocess: body.forceReprocess,
      async: body.async,
    });

    return NextResponse.json(withImportCorrelation(correlationId, result), {
      headers: importCorrelationHeaders(correlationId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Esecuzione import fallita";
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: message, code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(_request);
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return importErrorJson("PERMISSION_DENIED", correlationId, 401);

  const { id: importFileId } = await context.params;
  try {
    await assertImportFileAccess(importFileId, userId);
    const sb = await createSupabaseServerUserClient();
    const { data } = await sb
      .from("import_executions")
      .select("id, status, feature, correlation_id, error_code, created_at")
      .eq("import_file_id", importFileId)
      .order("created_at", { ascending: false })
      .limit(10);
    return NextResponse.json(
      withImportCorrelation(correlationId, { executions: data ?? [] }),
      { headers: importCorrelationHeaders(correlationId) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore caricamento executions";
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: message }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }
}
