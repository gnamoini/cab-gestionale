import { NextResponse } from "next/server";
import { fetchClientPreventivoPortalServer } from "@/lib/preventivi/preventivo-client-portal.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await fetchClientPreventivoPortalServer(id, { markViewed: true });
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Errore" }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
