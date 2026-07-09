import { NextResponse } from "next/server";
import { finalizeOrdineFornitoreImport } from "@/lib/ordini-fornitori/import/finalize-ordine-fornitore-import.server";
import { ordineFornitoreImportFinalizeRequestSchema } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import { traceOrdineFornitoreImportOperation } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-telemetry.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("preventivi");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canWrite || !canOrdini) {
    return NextResponse.json({ error: "Permesso negato", code: "UNAUTHORIZED" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Sessione non valida", code: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = ordineFornitoreImportFinalizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const t0 = performance.now();

  try {
    await finalizeOrdineFornitoreImport({
      source: parsed.data.source,
      ordineId: parsed.data.ordineId,
      contentHash: parsed.data.contentHash,
      semanticKey: parsed.data.semanticKey,
      userId,
    });
    traceOrdineFornitoreImportOperation({
      operation: "finalize",
      importFileId: parsed.data.source.type === "import_file" ? parsed.data.source.id : undefined,
      documentoId: parsed.data.source.type === "legacy_document" ? parsed.data.source.id : undefined,
      ordineId: parsed.data.ordineId,
      userId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "ok",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finalizzazione non riuscita.";
    traceOrdineFornitoreImportOperation({
      operation: "finalize",
      importFileId: parsed.data.source.type === "import_file" ? parsed.data.source.id : undefined,
      documentoId: parsed.data.source.type === "legacy_document" ? parsed.data.source.id : undefined,
      ordineId: parsed.data.ordineId,
      userId,
      durationMs: Math.round(performance.now() - t0),
      outcome: "error",
      errorCode: "ANALYZE_FAILED",
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
