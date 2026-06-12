import { recordDecisionAlignment } from "@/lib/decision/assert-decision-alignment";
import { buildRequestContextFromServer } from "@/lib/decision/request-context";
import { getAssetDeliveryStrategy } from "@/lib/decision/request-decision-registry";
import { deliverDocumentFile } from "@/lib/documents/document-delivery.server";
import { validateDocumentRouteParams } from "@/lib/edge/validators/document-route-params";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);

  const validation = validateDocumentRouteParams({
    docId: id,
    pathname: url.pathname,
    searchParams: url.searchParams,
    acceptHeader: request.headers.get("accept"),
    runtimeSource: "server",
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ctx = buildRequestContextFromServer(request);
  ctx.entityId = validation.params.docId;
  const delivery = getAssetDeliveryStrategy(ctx);
  recordDecisionAlignment({
    ctx,
    decisionKind: "delivery",
    serverValue: delivery.strategy,
    edgeHint: request.headers.get("x-edge-delivery-route"),
  });

  const { docId, source, mode, tipo } = validation.params;
  const result = await deliverDocumentFile({ id: docId, source, mode, tipo });
  if (!result.success || !result.data) {
    const message = result.error ?? "Documento non disponibile";
    const status = message.includes("Permesso") ? 403 : message.includes("mancante") ? 400 : 404;
    return NextResponse.json({ error: message }, { status });
  }

  const { bytes, headers } = result.data;
  return new Response(Buffer.from(bytes), { status: 200, headers });
}
