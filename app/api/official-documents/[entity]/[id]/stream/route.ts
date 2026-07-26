import { streamOfficialDdtPdfServer, streamOfficialPreventivoPdfServer } from "@/lib/official-documents/official-pdf-stream.server";
import { streamOfficialPdfByTokenServer } from "@/lib/official-documents/official-pdf-token-stream.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { entity, id } = await context.params;
  if (entity !== "preventivo" && entity !== "ddt") {
    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  }

  const result =
    entity === "preventivo"
      ? await streamOfficialPreventivoPdfServer(id)
      : await streamOfficialDdtPdfServer(id);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error ?? "PDF non disponibile" }, { status: 404 });
  }

  return new Response(Buffer.from(result.data.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
