import { NextResponse } from "next/server";
import { requireInventoryLabelsRead, requestOrigin } from "@/lib/inventory-labels/api-auth.server";
import { labelPayloadFromMagazzinoRow, magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";
import { ensureActiveInventoryToken } from "@/lib/inventory-labels/domain/tokens.server";
import { deliverInventoryLabel } from "@/lib/inventory-labels/render/deliver.server";
import { renderLabelQuerySchema } from "@/lib/inventory-labels/validation";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireInventoryLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = renderLabelQuerySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
    preset: url.searchParams.get("preset") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const { data: row, error } = await auth.sb
    .from("magazzino_ricambi")
    .select(MAGAZZINO_RICAMBI_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Ricambio non trovato" }, { status: 404 });

  const entityType = magazzinoRicambioEntityType();
  try {
    const tokenRow = await ensureActiveInventoryToken(auth.sb, entityType, id, auth.userId);
    const result = await deliverInventoryLabel({
      sb: auth.sb,
      entityType,
      entityId: id,
      payload: labelPayloadFromMagazzinoRow(row as MagazzinoRicambioRow),
      token: tokenRow.token,
      preset: parsed.data.preset,
      format: parsed.data.format,
      origin: requestOrigin(request),
      userId: auth.userId,
      device: request.headers.get("user-agent"),
    });

    return new Response(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `inline; filename="${result.fileName}"`,
        "X-Label-Cache": result.cacheStatus,
        "X-Label-Hash": result.hash,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rendering non riuscito" },
      { status: 500 },
    );
  }
}
