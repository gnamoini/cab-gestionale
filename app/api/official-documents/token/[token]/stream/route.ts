import { streamOfficialPdfByTokenServer } from "@/lib/official-documents/official-pdf-token-stream.server";
import { pdfArtifactResponseHeaders } from "@/lib/pdf/pdf-artifact-response";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await streamOfficialPdfByTokenServer(token);
  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error ?? "PDF non disponibile" }, { status: 404 });
  }

  const { bytes, fileName, cacheStatus, generateMs, dataHash } = result.data;
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: pdfArtifactResponseHeaders({ fileName, cacheStatus, generateMs, dataHash }),
  });
}
