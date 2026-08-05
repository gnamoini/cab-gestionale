import { NextResponse } from "next/server";
import { loadPreventivoEventsServer } from "@/lib/preventivi/preventivo-events.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await loadPreventivoEventsServer(id);
  if (!result.success) {
    const status = result.error === "Permesso richiesto." ? 403 : 400;
    return NextResponse.json({ error: result.error ?? "Errore" }, { status });
  }
  return NextResponse.json({ events: result.data }, { headers: { "Cache-Control": "no-store" } });
}
