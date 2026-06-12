import { buildRequestContextFromEdge } from "@/lib/decision/request-context";
import { getCachePolicy } from "@/lib/decision/request-decision-registry";
import { validateMediaImagePath } from "@/lib/edge/validators/media-path";
import type { NextRequest } from "next/server";
import type { EdgeHandlerResult } from "@/lib/edge/edge-types";

export function runMediaCacheEdge(request: NextRequest): EdgeHandlerResult {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path");
  const validation = validateMediaImagePath(rawPath, "edge");

  if (!validation.ok) {
    return {
      outcome: "handled",
      status: 400,
      contentType: "text/plain",
      body: validation.error,
      latencySavedEstimate: 10,
    };
  }

  const ctx = buildRequestContextFromEdge(request);
  ctx.flags = { ...ctx.flags, normalizedStoragePath: validation.normalizedPath };
  const cache = getCachePolicy(ctx);

  return {
    outcome: "fallback",
    reason: "needs_server_transcode",
    requestHeaders: {
      "x-edge-cache-policy": cache.tier,
    },
  };
}
