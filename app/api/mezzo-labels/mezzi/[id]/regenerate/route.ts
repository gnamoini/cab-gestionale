import { NextResponse } from "next/server";
import { requireMezzoLabelsWrite, requestOrigin } from "@/lib/mezzo-labels/api-auth.server";
import { regenerateMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";
import { buildMezzoQrUrl } from "@/lib/mezzo-labels/domain/tokens";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireMezzoLabelsWrite();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const { data: row, error } = await auth.sb.from("mezzi").select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Mezzo non trovato" }, { status: 404 });

  try {
    const tokenRow = await regenerateMezzoQrToken(auth.sb, id, auth.userId);
    const origin = requestOrigin(request);
    return NextResponse.json({
      token: tokenRow.token,
      qrUrl: buildMezzoQrUrl(tokenRow.token, origin),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rigenerazione non riuscita" },
      { status: 500 },
    );
  }
}
