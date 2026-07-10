import { NextResponse } from "next/server";
import { listImportBatches } from "@/lib/data-import/core/batch-store.server";
import { requireImportAuthByEntity } from "@/lib/data-import/core/import-api-auth.server";
import type { ImportEntity } from "@/lib/data-import/core/types";

export const runtime = "nodejs";

const BATCH_ENTITIES = new Set<ImportEntity>(["magazzino_ricambi", "clienti_anagrafica", "listino_ricambi"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") as ImportEntity | null;
  if (!entity || !BATCH_ENTITIES.has(entity)) {
    return NextResponse.json({ error: "Parametro entity obbligatorio e valido." }, { status: 400 });
  }

  const auth = await requireImportAuthByEntity(entity);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const rows = await listImportBatches(entity, Math.min(100, Math.max(1, limit)));
    return NextResponse.json({ batches: rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore caricamento storico." }, { status: 400 });
  }
}
