import { NextResponse } from "next/server";
import { buildOrdineFornitoreSendPreviewServer } from "@/lib/ordini-fornitori/ordine-fornitore-send-preview.server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await buildOrdineFornitoreSendPreviewServer(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Permesso richiesto." ? 403 : 400 });
  }
  return NextResponse.json(result.data);
}
