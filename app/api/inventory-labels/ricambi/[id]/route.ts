import { NextResponse } from "next/server";
import { requireInventoryLabelsRead, requestOrigin } from "@/lib/inventory-labels/api-auth.server";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { ensureActiveInventoryToken } from "@/lib/inventory-labels/domain/tokens.server";
import { magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireInventoryLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const entityType = magazzinoRicambioEntityType();

  const { data: ricambio, error: ricErr } = await auth.sb
    .from("magazzino_ricambi")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (ricErr) return NextResponse.json({ error: ricErr.message }, { status: 500 });
  if (!ricambio) return NextResponse.json({ error: "Ricambio non trovato" }, { status: 404 });

  try {
    const tokenRow = await ensureActiveInventoryToken(auth.sb, entityType, id, auth.userId);
    const origin = requestOrigin(request);
    return NextResponse.json({
      ricambioId: id,
      token: tokenRow.token,
      status: tokenRow.status,
      qrUrl: buildInventoryQrUrl(tokenRow.token, origin),
      createdAt: tokenRow.created_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore token" },
      { status: 500 },
    );
  }
}
