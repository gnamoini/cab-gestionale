import { isPdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { deliverPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-generate.server";
import { pdfArtifactResponseHeaders } from "@/lib/pdf/pdf-artifact-response";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ type: string }> };

function artifactErrorStatus(message: string): number {
  if (message.includes("Permesso")) return 403;
  if (message.includes("mancante") || message.includes("richiesti")) return 400;
  if (message.includes("non trovat") || message.includes("non disponibil") || message.includes("Nessun")) {
    return 404;
  }
  return 500;
}

export async function GET(request: Request, context: RouteContext) {
  try {
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
      return NextResponse.json({ error: message }, { status: artifactErrorStatus(message) });
    }

    const { bytes, fileName, cacheStatus, generateMs, dataHash } = result.data;
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: pdfArtifactResponseHeaders({ fileName, cacheStatus, generateMs, dataHash }),
    });
  } catch (error) {
    console.error("[pdf-artifact] route failed:", error);
    return NextResponse.json({ error: "Generazione PDF non riuscita" }, { status: 500 });
  }
}
