import { NextResponse } from "next/server";
import { buildOrdineFornitoreImportAnalyze } from "@/lib/ordini-fornitori/import/build-ordine-fornitore-import-analyze.server";
import { ordineFornitoreImportAnalyzeRequestSchema } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerModuleCan,
  verifyServerPageRead,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("preventivi");
  const canReadDocs = await verifyServerPageRead("documenti");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canWrite || !canReadDocs || !canOrdini) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = ordineFornitoreImportAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  try {
    const result = await buildOrdineFornitoreImportAnalyze(parsed.data.documentoId, userId, {
      skipHashDuplicate: parsed.data.skipHashDuplicate,
      skipSemanticDuplicate: parsed.data.skipSemanticDuplicate,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analisi import non riuscita.";
    const status = message.includes("non configurato") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
