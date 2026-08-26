import { NextResponse } from "next/server";
import { requireMezzoLabelsRead, requestOrigin } from "@/lib/mezzo-labels/api-auth.server";
import {
  deliverMezzoLabelsBulk,
  mezzoLabelPayloadFromRow,
  type MezzoLabelBulkItem,
} from "@/lib/mezzo-labels/render/deliver.server";
import {
  MEZZO_BULK_ABSOLUTE_MAX,
  mezzoLabelBulkRequestSchema,
  normalizeMezzoBulkIds,
} from "@/lib/mezzo-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const parsed = mezzoLabelBulkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mezzoIds, selectAllMatching, format } = parsed.data;
  if (format !== "pdf") {
    return NextResponse.json({ error: "Il bulk supporta solo format=pdf" }, { status: 400 });
  }

  if (selectAllMatching) {
    return NextResponse.json(
      { error: "selectAllMatching non ancora disponibile — usare mezzoIds" },
      { status: 501 },
    );
  }

  const ids = normalizeMezzoBulkIds(mezzoIds ?? []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Nessun mezzo selezionato" }, { status: 400 });
  }
  if (ids.length > MEZZO_BULK_ABSOLUTE_MAX) {
    return NextResponse.json(
      { error: `Massimo ${MEZZO_BULK_ABSOLUTE_MAX} etichette per richiesta` },
      { status: 400 },
    );
  }

  const { data: rows, error } = await auth.sb
    .from("mezzi")
    .select("id, targa, numero_scuderia")
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const items: MezzoLabelBulkItem[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    items.push({ mezzoId: id, payload: mezzoLabelPayloadFromRow(row) });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Nessun mezzo accessibile" }, { status: 404 });
  }

  try {
    const { bytes, count } = await deliverMezzoLabelsBulk({
      sb: auth.sb,
      items,
      origin: requestOrigin(request),
      userId: auth.userId,
      device: request.headers.get("user-agent"),
    });

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etichette-mezzi-${count}.pdf"`,
        "X-Mezzo-Label-Count": String(count),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generazione bulk fallita" },
      { status: 500 },
    );
  }
}
