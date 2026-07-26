import { NextResponse } from "next/server";
import { z } from "zod";
import { transitionPreventivoStatusServer } from "@/lib/preventivi/preventivo-status-transition.server";
import type { PreventivoStato } from "@/lib/preventivi/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.enum(["inviato", "confermato", "annullato"]),
  autore: z.string().max(200).optional(),
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
    return NextResponse.json({ error: "Parametri non validi", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await transitionPreventivoStatusServer({
    preventivoId: id,
    to: parsed.data.to as PreventivoStato,
    autore: parsed.data.autore,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Transizione non riuscita" }, { status: 400 });
  }

  return NextResponse.json({ row: result.data });
}
