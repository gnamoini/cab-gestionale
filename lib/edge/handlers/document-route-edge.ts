import { buildRequestContextFromEdge } from "@/lib/decision/request-context";
import { getAssetDeliveryStrategy } from "@/lib/decision/request-decision-registry";
import { extractDocumentIdFromPath } from "@/lib/edge/edge-function-registry";
import { validateDocumentRouteParams } from "@/lib/edge/validators/document-route-params";
import type { NextRequest } from "next/server";
import type { EdgeHandlerResult } from "@/lib/edge/edge-types";

export function runDocumentRouteEdge(request: NextRequest): EdgeHandlerResult {
  const url = new URL(request.url);
  const docId = extractDocumentIdFromPath(url.pathname);
  const validation = validateDocumentRouteParams({
    docId,
    pathname: url.pathname,
    searchParams: url.searchParams,
    acceptHeader: request.headers.get("accept"),
    runtimeSource: "edge",
  });

  if (!validation.ok) {
    return {
      outcome: "handled",
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: validation.error }),
      latencySavedEstimate: 15,
    };
  }

  const ctx = buildRequestContextFromEdge(request);
  const delivery = getAssetDeliveryStrategy(ctx);

  return {
    outcome: "fallback",
    reason: "needs_server_delivery",
    requestHeaders: {
      "x-edge-delivery-route": delivery.strategy,
    },
  };
}
