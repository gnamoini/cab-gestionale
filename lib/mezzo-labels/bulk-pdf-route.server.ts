import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deliverMezzoLabelsBulk,
  mezzoLabelPayloadFromRow,
  type MezzoLabelBulkItem,
} from "@/lib/mezzo-labels/render/deliver.server";
import { MEZZO_BULK_ABSOLUTE_MAX, normalizeMezzoBulkIds } from "@/lib/mezzo-labels/validation";

export async function buildMezzoLabelsBulkPdfResponse(input: {
  sb: SupabaseClient;
  ids: string[];
  origin: string;
  userId: string | null;
  device: string | null;
}): Promise<Response> {
  const ids = normalizeMezzoBulkIds(input.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Nessun mezzo selezionato" }, { status: 400 });
  }
  if (ids.length > MEZZO_BULK_ABSOLUTE_MAX) {
    return NextResponse.json(
      { error: `Massimo ${MEZZO_BULK_ABSOLUTE_MAX} etichette per richiesta` },
      { status: 400 },
    );
  }

  const { data: rows, error } = await input.sb
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
      sb: input.sb,
      items,
      origin: input.origin,
      userId: input.userId,
      device: input.device,
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
