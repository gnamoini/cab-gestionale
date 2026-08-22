import { NextResponse } from "next/server";
import {
  parseOrdineFornitoreDeliveryBody,
  receiveOrdineFornitoreDeliveryServer,
} from "@/lib/ordini-fornitori/ordine-fornitore-delivery.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const input = parseOrdineFornitoreDeliveryBody(body);
  if (!input) {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const result = await receiveOrdineFornitoreDeliveryServer(id, input);
  if (!result.success) {
    const status =
      result.error === "Permesso richiesto." || result.error === "Permesso magazzino richiesto per il carico."
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
