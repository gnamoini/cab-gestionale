import { NextResponse } from "next/server";
import { requireMezzoLabelsRead, requestOrigin } from "@/lib/mezzo-labels/api-auth.server";
import { getActiveMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";
import { buildMezzoQrUrl } from "@/lib/mezzo-labels/domain/tokens";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const { data: row, error } = await auth.sb
    .from("mezzi")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Mezzo non trovato" }, { status: 404 });

  const tokenRow = await getActiveMezzoQrToken(auth.sb, id);
  if (!tokenRow) {
    return NextResponse.json({ token: null, qrUrl: null });
  }

  const origin = requestOrigin(_request);
  return NextResponse.json({
    token: tokenRow.token,
    qrUrl: buildMezzoQrUrl(tokenRow.token, origin),
  });
}
