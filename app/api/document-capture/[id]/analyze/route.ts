import { NextResponse } from "next/server";
import { importCorrelationHeaders, resolveRequestCorrelationId, withImportCorrelation } from "@/lib/import-core/import-http.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** @deprecated Use POST /api/document-capture/{id}/process — orchestrator SSOT. */
export async function POST(request: Request, context: RouteContext) {
  const correlationId = resolveRequestCorrelationId(request);
  const { id } = await context.params;
  const processUrl = new URL(`/api/document-capture/${id}/process`, request.url);
  return NextResponse.json(
    withImportCorrelation(correlationId, {
      error: "Endpoint deprecato. Usa POST /api/document-capture/{id}/process.",
      code: "DEPRECATED_ENDPOINT",
      redirectTo: processUrl.pathname,
    }),
    { status: 410, headers: importCorrelationHeaders(correlationId) },
  );
}
