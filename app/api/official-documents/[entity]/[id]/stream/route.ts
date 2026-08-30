import { streamOfficialDdtPdfServer, streamOfficialPreventivoPdfServer } from "@/lib/official-documents/official-pdf-stream.server";
import { pdfArtifactResponseHeaders } from "@/lib/pdf/pdf-artifact-response";
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

  const { bytes, fileName, cacheStatus, generateMs, dataHash } = result.data;
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: pdfArtifactResponseHeaders({ fileName, cacheStatus, generateMs, dataHash }),
  });
}
