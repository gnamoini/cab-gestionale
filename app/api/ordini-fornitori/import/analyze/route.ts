import { NextResponse } from "next/server";
import { buildOrdineFornitoreImportAnalyzeFromSource } from "@/lib/ordini-fornitori/import/build-ordine-fornitore-import-analyze.server";
import {
  isOrdineFornitoreImportAnalyzeError,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-analyze-error";
import { httpStatusForOrdineFornitoreImportError } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-error-codes";
import { ordineFornitoreImportAnalyzeRequestSchema } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import { traceOrdineFornitoreImportOperation } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-telemetry.server";
import { importSourceRefFromAnalyzeBody } from "@/lib/import-sources/types";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerModuleCan,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("preventivi");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canWrite || !canOrdini) {
    return NextResponse.json({ error: "Permesso negato", code: "UNAUTHORIZED" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido", code: "ANALYZE_FAILED" }, { status: 400 });
  }

  const parsed = ordineFornitoreImportAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi", code: "ANALYZE_FAILED" }, { status: 400 });
  }

  const source = importSourceRefFromAnalyzeBody(parsed.data);
  if (!source) {
    return NextResponse.json({ error: "Sorgente import mancante", code: "ANALYZE_FAILED" }, { status: 400 });
  }

  const t0 = performance.now();
  const sourceId = source.id;

  try {
    const result = await buildOrdineFornitoreImportAnalyzeFromSource(source, userId, {
      skipHashDuplicate: parsed.data.skipHashDuplicate,
      skipSemanticDuplicate: parsed.data.skipSemanticDuplicate,
    });
    traceOrdineFornitoreImportOperation({
      operation: "analyze",
      importFileId: source.type === "import_file" ? sourceId : undefined,
      documentoId: source.type === "legacy_document" ? sourceId : undefined,
      userId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json(result);
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    if (isOrdineFornitoreImportAnalyzeError(error)) {
      traceOrdineFornitoreImportOperation({
        operation: "analyze",
        importFileId: source.type === "import_file" ? sourceId : undefined,
        documentoId: source.type === "legacy_document" ? sourceId : undefined,
        userId,
        durationMs,
        outcome: "error",
        errorCode: error.code,
        storagePath: error.storagePath,
        bucket: error.bucket,
        storageErrorCode: error.storageErrorCode,
        isPolicyError: error.isPolicyError,
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: httpStatusForOrdineFornitoreImportError(error.code) },
      );
    }
    const message = error instanceof Error ? error.message : "Analisi import non riuscita.";
    traceOrdineFornitoreImportOperation({
      operation: "analyze",
      importFileId: source.type === "import_file" ? sourceId : undefined,
      documentoId: source.type === "legacy_document" ? sourceId : undefined,
      userId,
      durationMs,
      outcome: "error",
      errorCode: "ANALYZE_FAILED",
    });
    return NextResponse.json({ error: message, code: "ANALYZE_FAILED" }, { status: 400 });
  }
}
