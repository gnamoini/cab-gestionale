import { NextResponse } from "next/server";
import { buildOrdineFornitoreImportAnalyzeFromSource } from "@/lib/ordini-fornitori/import/build-ordine-fornitore-import-analyze.server";
import {
  isOrdineFornitoreImportAnalyzeError,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-analyze-error";
import { httpStatusForOrdineFornitoreImportError } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-error-codes";
import { ordineFornitoreImportAnalyzeRequestSchema } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import { traceOrdineFornitoreImportOperation } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-telemetry.server";
import { importCorrelationHeaders, resolveRequestCorrelationId, withImportCorrelation } from "@/lib/import-core/import-http.server";
import { traceImportOperation } from "@/lib/import-core/import-telemetry.server";
import { importErrorUserMessage } from "@/lib/import-core/import-error-catalog";
import { importSourceRefFromAnalyzeBody } from "@/lib/import-sources/types";
import { gestionaleLogger } from "@/lib/observability/logger";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerModuleCan,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const correlationId = resolveRequestCorrelationId(request);
  const canWrite = await verifyServerPageWrite("preventivi");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canWrite || !canOrdini) {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Permesso negato", code: "PERMISSION_DENIED" }),
      { status: 403, headers: importCorrelationHeaders(correlationId) },
    );
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Sessione non valida", code: "PERMISSION_DENIED" }),
      { status: 401, headers: importCorrelationHeaders(correlationId) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Body JSON non valido", code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }

  const parsed = ordineFornitoreImportAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Parametri non validi", code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }

  const source = importSourceRefFromAnalyzeBody(parsed.data);
  if (!source) {
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: "Sorgente import mancante", code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }

  if (source.type === "legacy_document") {
    gestionaleLogger.warn("import.ordini_fornitore.legacy_document_path", {
      operation: "system",
      meta: { documentoId: source.id, hint: "Migrare a import_files (Sprint 3)" },
    });
  }

  const t0 = performance.now();
  const sourceId = source.id;
  const importFileId = source.type === "import_file" ? sourceId : undefined;
  const documentoId = source.type === "legacy_document" ? sourceId : undefined;

  try {
    const result = await buildOrdineFornitoreImportAnalyzeFromSource(source, userId, {
      skipHashDuplicate: parsed.data.skipHashDuplicate,
      skipSemanticDuplicate: parsed.data.skipSemanticDuplicate,
    });
    const durationMs = Math.round(performance.now() - t0);
    traceOrdineFornitoreImportOperation({
      operation: "analyze",
      importFileId,
      documentoId,
      userId,
      durationMs,
      outcome: "ok",
    });
    traceImportOperation({
      scope: "ordini_fornitori_import",
      operation: "analyze",
      correlationId,
      outcome: "ok",
      userId,
      importFileId,
      documentoId,
      durationMs,
    });
    return NextResponse.json(withImportCorrelation(correlationId, result), {
      headers: importCorrelationHeaders(correlationId),
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    if (isOrdineFornitoreImportAnalyzeError(error)) {
      traceOrdineFornitoreImportOperation({
        operation: "analyze",
        importFileId,
        documentoId,
        userId,
        durationMs,
        outcome: "error",
        errorCode: error.code,
        storagePath: error.storagePath,
        bucket: error.bucket,
        storageErrorCode: error.storageErrorCode,
        isPolicyError: error.isPolicyError,
      });
      traceImportOperation({
        scope: "ordini_fornitori_import",
        operation: "analyze",
        correlationId,
        outcome: "error",
        userId,
        importFileId,
        documentoId,
        durationMs,
        errorCode: error.code === "NOT_CONFIGURED" ? "AI_NOT_CONFIGURED" : "AI_PARSE_ERROR",
      });
      return NextResponse.json(
        withImportCorrelation(correlationId, { error: error.message, code: error.code }),
        { status: httpStatusForOrdineFornitoreImportError(error.code), headers: importCorrelationHeaders(correlationId) },
      );
    }
    traceOrdineFornitoreImportOperation({
      operation: "analyze",
      importFileId,
      documentoId,
      userId,
      durationMs,
      outcome: "error",
      errorCode: "ANALYZE_FAILED",
    });
    traceImportOperation({
      scope: "ordini_fornitori_import",
      operation: "analyze",
      correlationId,
      outcome: "error",
      userId,
      importFileId,
      documentoId,
      durationMs,
      errorCode: "AI_PARSE_ERROR",
    });
    return NextResponse.json(
      withImportCorrelation(correlationId, { error: importErrorUserMessage("AI_PARSE_ERROR"), code: "AI_PARSE_ERROR" }),
      { status: 400, headers: importCorrelationHeaders(correlationId) },
    );
  }
}
