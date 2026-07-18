import { NextResponse } from "next/server";
import { fetchInventoryReceivingDocument } from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const { id } = await context.params;
  const data = await fetchInventoryReceivingDocument(id, { includeCandidates: true });
  if (!data) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  return NextResponse.json(data);
}
