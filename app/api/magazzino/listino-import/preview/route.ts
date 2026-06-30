import { NextResponse } from "next/server";
import { buildListinoImportPreview } from "@/lib/magazzino/listino-import/listino-import-preview.server";
import { listinoImportPreviewRequestSchema } from "@/lib/magazzino/listino-import/listino-import-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerSectionRead,
  verifyServerSectionWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const canWriteMagazzino = await verifyServerSectionWrite("magazzino");
  const canReadDocumenti = await verifyServerSectionRead("documenti");
  if (!canWriteMagazzino || !canReadDocumenti) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = listinoImportPreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  try {
    const preview = await buildListinoImportPreview(parsed.data.documentoId, userId);
    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anteprima import non riuscita.";
    const status = message.includes("non configurato") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
