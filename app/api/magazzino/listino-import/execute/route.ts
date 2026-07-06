import { NextResponse } from "next/server";
import {
  executeListinoImport,
  fetchDocumentoForImport,
} from "@/lib/magazzino/listino-import/listino-import-execute.server";
import { listinoImportExecuteRequestSchema } from "@/lib/magazzino/listino-import/listino-import-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerPageRead,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWriteMagazzino = await verifyServerPageWrite("magazzino");
  const canReadDocumenti = await verifyServerPageRead("documenti");
  if (!canWriteMagazzino || !canReadDocumenti) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = listinoImportExecuteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri import non validi" }, { status: 400 });
  }

  try {
    const doc = await fetchDocumentoForImport(parsed.data.documentoId);
    if (doc.id !== parsed.data.documentoId) {
      return NextResponse.json({ error: "Documento non valido" }, { status: 400 });
    }

    const result = await executeListinoImport({
      documentoId: parsed.data.documentoId,
      documentoNome: doc.nome,
      batchId: parsed.data.batchId,
      marcaDefault: doc.marca,
      decisions: parsed.data.decisions,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import listino non riuscito.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
