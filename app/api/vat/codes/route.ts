import { NextResponse } from "next/server";
import { listVatCodesForContext } from "@/lib/vat/vat-engine.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const operationDate = url.searchParams.get("operation_date") ?? new Date().toISOString().slice(0, 10);
  const direction = (url.searchParams.get("direction") ?? "sales") as "sales" | "purchase" | "both";

  try {
    const codes = await listVatCodesForContext({ operation_date: operationDate, direction });
    return NextResponse.json({ codes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore caricamento codici IVA";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
