import { NextResponse } from "next/server";
import { requireMezzoLabelsRead, requestOrigin } from "@/lib/mezzo-labels/api-auth.server";
import { deliverMezzoLabel, mezzoLabelPayloadFromRow } from "@/lib/mezzo-labels/render/deliver.server";
import { renderMezzoLabelQuerySchema } from "@/lib/mezzo-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = renderMezzoLabelQuerySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const { data: row, error } = await auth.sb
    .from("mezzi")
    .select("id, targa, numero_scuderia")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Mezzo non trovato" }, { status: 404 });

  try {
    const result = await deliverMezzoLabel({
      sb: auth.sb,
      mezzoId: id,
      payload: mezzoLabelPayloadFromRow(row),
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
        "X-Mezzo-Label-Token": result.token,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rendering non riuscito" },
      { status: 500 },
    );
  }
}
