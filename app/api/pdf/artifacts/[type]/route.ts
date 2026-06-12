import { isPdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { deliverPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-generate.server";
import { pdfArtifactResponseHeaders } from "@/lib/pdf/pdf-artifact-response";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ type: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { type } = await context.params;
  if (!isPdfArtifactType(type)) {
    return NextResponse.json({ error: "Tipo artifact non valido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const result = await deliverPdfArtifact(type, {
    id: url.searchParams.get("id") ?? undefined,
    lavorazioneId: url.searchParams.get("lavorazioneId") ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
    employeeId: url.searchParams.get("employeeId") ?? undefined,
    autore: url.searchParams.get("autore") ?? undefined,
  });

  if (!result.success || !result.data) {
    const message = result.error ?? "Generazione PDF non riuscita";
    const status = message.includes("Permesso") ? 403 : message.includes("mancante") ? 400 : 404;
    return NextResponse.json({ error: message }, { status });
  }

  const { bytes, fileName, cacheStatus, generateMs, dataHash } = result.data;
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: pdfArtifactResponseHeaders({ fileName, cacheStatus, generateMs, dataHash }),
  });
}
