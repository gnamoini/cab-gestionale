import { NextResponse } from "next/server";
import { finalizeOrdineFornitoreImportDocument } from "@/lib/ordini-fornitori/import/finalize-ordine-fornitore-import-document.server";
import { ordineFornitoreImportFinalizeRequestSchema } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerModuleCan, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("preventivi");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canWrite || !canOrdini) {
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

  const parsed = ordineFornitoreImportFinalizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  try {
    await finalizeOrdineFornitoreImportDocument({
      documentoId: parsed.data.documentoId,
      action: parsed.data.action,
      ordineId: parsed.data.ordineId,
      contentHash: parsed.data.contentHash,
      semanticKey: parsed.data.semanticKey,
      userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finalizzazione non riuscita.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
