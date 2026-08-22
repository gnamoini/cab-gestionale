import { NextResponse } from "next/server";
import { fetchInTransitDetailForRicambioServer } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit.server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ricambioId: string }> },
) {
  const { ricambioId } = await context.params;
  const result = await fetchInTransitDetailForRicambioServer(ricambioId);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Permesso richiesto." ? 403 : 400 },
    );
  }

  return NextResponse.json({ rows: result.data ?? [] });
}
