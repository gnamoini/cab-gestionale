import { NextResponse } from "next/server";
import { fetchInTransitMapServer } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ricambio_ids");
  const ricambioIds = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const result = await fetchInTransitMapServer(ricambioIds);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Permesso richiesto." ? 403 : 400 },
    );
  }

  return NextResponse.json({ byRicambio: result.data ?? {} });
}
