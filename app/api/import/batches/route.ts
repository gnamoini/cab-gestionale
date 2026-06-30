import { NextResponse } from "next/server";
import { listImportBatches } from "@/lib/data-import/core/batch-store.server";
import { requireImportSession } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const rows = await listImportBatches(
      entity === "magazzino_ricambi" || entity === "clienti_anagrafica" ? entity : undefined,
      Math.min(100, Math.max(1, limit)),
    );
    return NextResponse.json({ batches: rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore caricamento storico." }, { status: 400 });
  }
}
