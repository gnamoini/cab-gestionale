import { NextResponse } from "next/server";
import { buildListinoImportPreview } from "@/lib/magazzino/listino-import/listino-import-preview.server";
import { buildListinoImportPreviewFromImportFile } from "@/lib/magazzino/listino-import/listino-import-from-import-file.server";
import { listinoImportPreviewRequestSchema } from "@/lib/magazzino/listino-import/listino-import-schema";
import {
  importCorrelationHeaders,
  importErrorJson,
  resolveRequestCorrelationId,
  withImportCorrelation,
} from "@/lib/import-core/import-http.server";
import { traceImportOperation } from "@/lib/import-core/import-telemetry.server";
import { runImportFileExecution } from "@/lib/import-core/import-run.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerPageRead,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";
// ponytail: Vercel Hobby cap 300s — async path preferred for PDF grandi.
export const maxDuration = 300;

async function resolveCompanyId(userId: string): Promise<string | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ? String(data.company_id) : null;
}

export async function POST(request: Request) {
  const correlationId = resolveRequestCorrelationId(request);
  const canWriteMagazzino = await verifyServerPageWrite("magazzino");
  const canReadDocumenti = await verifyServerPageRead("documenti");
  if (!canWriteMagazzino || !canReadDocumenti) {
    return importErrorJson("PERMISSION_DENIED", correlationId, 403);
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return importErrorJson("PERMISSION_DENIED", correlationId, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return importErrorJson("AI_PARSE_ERROR", correlationId, 400);
  }

  const parsed = listinoImportPreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return importErrorJson("AI_PARSE_ERROR", correlationId, 400);
  }

  const t0 = performance.now();
  const { documentoId, importFileId, async: runAsync } = parsed.data;

  try {
    if (runAsync && importFileId) {
      const companyId = await resolveCompanyId(userId);
      if (!companyId) return importErrorJson("TENANT_ACCESS_DENIED", correlationId, 403);
      const execution = await runImportFileExecution({
        importFileId,
        feature: "listino_pdf",
        userId,
        companyId,
        correlationId,
        forceReprocess: false,
        async: true,
      });
      traceImportOperation({
        scope: "listino_import",
        operation: "preview_async",
        correlationId,
        outcome: "ok",
        userId,
        companyId,
        importFileId,
        executionId: execution.executionId,
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(withImportCorrelation(correlationId, execution), {
        headers: importCorrelationHeaders(correlationId),
      });
    }

    const preview = importFileId
      ? await buildListinoImportPreviewFromImportFile(importFileId, userId)
      : await buildListinoImportPreview(documentoId!, userId);

    traceImportOperation({
      scope: "listino_import",
      operation: importFileId ? "preview_import_file" : "preview_documento",
      correlationId,
      outcome: "ok",
      userId,
      importFileId,
      documentoId,
      durationMs: Math.round(performance.now() - t0),
    });

    return NextResponse.json(withImportCorrelation(correlationId, preview), {
      headers: importCorrelationHeaders(correlationId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anteprima import non riuscita.";
    const code = message.includes("non configurato")
      ? "AI_NOT_CONFIGURED"
      : message.includes("timeout")
        ? "AI_TIMEOUT"
        : "AI_PARSE_ERROR";
    traceImportOperation({
      scope: "listino_import",
      operation: "preview",
      correlationId,
      outcome: "error",
      userId,
      importFileId,
      documentoId,
      durationMs: Math.round(performance.now() - t0),
      errorCode: code,
    });
    const status = code === "AI_NOT_CONFIGURED" ? 503 : 400;
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: message, code }),
      { status, headers: importCorrelationHeaders(correlationId) },
    );
  }
}
