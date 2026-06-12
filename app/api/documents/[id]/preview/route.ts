import { recordDecisionAlignment } from "@/lib/decision/assert-decision-alignment";
import { buildRequestContextFromServer } from "@/lib/decision/request-context";
import { getAssetDeliveryStrategy } from "@/lib/decision/request-decision-registry";
import { deliverDocumentPreview } from "@/lib/documents/document-preview-deliver.server";
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

  const { docId, source, tipo } = validation.params;
  const result = await deliverDocumentPreview({ id: docId, source, tipo });
  if (!result.success || !result.data) {
    const message = result.error ?? "Anteprima non disponibile";
    const status = message.includes("Permesso")
      ? 403
      : message.includes("non disponibile")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { bytes, headers } = result.data;
  return new Response(Buffer.from(bytes), { status: 200, headers });
}
