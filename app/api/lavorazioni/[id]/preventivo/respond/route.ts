import { NextResponse } from "next/server";
import { z } from "zod";
import { respondClientPreventivoServer } from "@/lib/preventivi/preventivo-client-portal.server";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["accept", "reject"]),
  motivazione: z.string().max(2000).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const result = await respondClientPreventivoServer({
    lavorazioneId: id,
    action: parsed.data.action,
    motivazione: parsed.data.motivazione,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Operazione non riuscita" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
