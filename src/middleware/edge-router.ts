import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildRequestContextFromEdge } from "@/lib/decision/request-context";
import { getRouteClassification } from "@/lib/decision/request-decision-registry";
import { resolveCorrelationId } from "@/lib/edge/edge-correlation";
import { matchAuthPrecheckRoute, matchEdgeRoute } from "@/lib/edge/edge-function-registry";
import { runAuthPrecheckEdgeFromCookies } from "@/lib/edge/handlers/auth-precheck-edge";
import { runDocumentRouteEdge } from "@/lib/edge/handlers/document-route-edge";
import { runMediaCacheEdge } from "@/lib/edge/handlers/media-cache-edge";
import { runUploadPolicyPrecheckEdge } from "@/lib/edge/handlers/upload-policy-precheck-edge";
import type { EdgeHandlerId, EdgeHandlerResult } from "@/lib/edge/edge-types";
import { isEdgeLayerEnabled, isEdgeRouteGroupEnabled, isEdgeRuntimeTraceEnabled } from "@/lib/observability/config";
import { recordEdgeRuntimeEvent } from "@/lib/observability/edge-runtime-tracer";

function attachEdgeTraceHeaders(
  res: NextResponse,
  input: {
    correlationId: string;
    handlerId: EdgeHandlerId;
    decision: "hit" | "fallback";
    fallbackReason?: string;
    latencyMs: number;
    latencySavedEstimate?: number;
  },
): NextResponse {
  if (!isEdgeRuntimeTraceEnabled()) return res;
  res.headers.set("X-Correlation-Id", input.correlationId);
  res.headers.set("X-Edge-Decision", input.decision);
  res.headers.set("X-Edge-Handler", input.handlerId);
  if (input.fallbackReason) res.headers.set("X-Edge-Fallback-Reason", input.fallbackReason);
  if (input.latencySavedEstimate != null) {
    res.headers.set("X-Edge-Latency-Saved", String(input.latencySavedEstimate));
  }
  res.headers.set("X-Edge-Latency-Ms", String(input.latencyMs));
  return res;
}

function attachRdrRouteClass(res: NextResponse, request: NextRequest): NextResponse {
  const ctx = buildRequestContextFromEdge(request);
  const routeClass = getRouteClassification(ctx);
  res.headers.set("X-RDR-Route-Class", routeClass.classification);
  return res;
}

function buildHandledResponse(
  result: Extract<EdgeHandlerResult, { outcome: "handled" }>,
  base: NextResponse,
  meta: { correlationId: string; handlerId: EdgeHandlerId; pathname: string; method: string; latencyMs: number },
): NextResponse {
  const res = new NextResponse(result.body ?? null, {
    status: result.status,
    headers: result.contentType ? { "Content-Type": result.contentType } : undefined,
  });

  for (const [k, v] of base.cookies.getAll().map((c) => [c.name, c.value] as const)) {
    res.cookies.set(k, v);
  }

  recordEdgeRuntimeEvent({
    type: "edge_hit",
    handlerId: meta.handlerId,
    pathname: meta.pathname,
    method: meta.method,
    decision: "hit",
    latencyMs: meta.latencyMs,
    latencySavedEstimate: result.latencySavedEstimate,
    correlationId: meta.correlationId,
  });

  return attachEdgeTraceHeaders(res, {
    correlationId: meta.correlationId,
    handlerId: meta.handlerId,
    decision: "hit",
    latencyMs: meta.latencyMs,
    latencySavedEstimate: result.latencySavedEstimate,
  });
}

function buildFallbackResponse(
  request: NextRequest,
  result: Extract<EdgeHandlerResult, { outcome: "fallback" }>,
  base: NextResponse,
  meta: { correlationId: string; handlerId: EdgeHandlerId; pathname: string; method: string; latencyMs: number },
): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("X-Correlation-Id", meta.correlationId);
  if (result.requestHeaders) {
    for (const [k, v] of Object.entries(result.requestHeaders)) {
      headers.set(k, v);
    }
  }

  const res = NextResponse.next({
    request: { headers },
  });

  for (const c of base.cookies.getAll()) {
    res.cookies.set(c.name, c.value);
  }

  recordEdgeRuntimeEvent({
    type: "edge_miss",
    handlerId: meta.handlerId,
    pathname: meta.pathname,
    method: meta.method,
    decision: "fallback",
    fallbackReason: result.reason,
    latencyMs: meta.latencyMs,
    latencySavedEstimate: result.latencySavedEstimate,
    correlationId: meta.correlationId,
  });

  return attachEdgeTraceHeaders(res, {
    correlationId: meta.correlationId,
    handlerId: meta.handlerId,
    decision: "fallback",
    fallbackReason: result.reason,
    latencyMs: meta.latencyMs,
    latencySavedEstimate: result.latencySavedEstimate,
  });
}

async function dispatchHandler(handlerId: EdgeHandlerId, request: NextRequest): Promise<EdgeHandlerResult> {
  switch (handlerId) {
    case "document-route-edge":
      return runDocumentRouteEdge(request);
    case "media-cache-edge":
      return runMediaCacheEdge(request);
    case "upload-policy-precheck-edge":
      return runUploadPolicyPrecheckEdge(request);
    default:
      return { outcome: "fallback", reason: "unknown_handler" };
  }
}

/** Early auth JWT exp check — runs before Supabase getUser on /api/*. */
export function tryAuthPrecheckEdge(request: NextRequest): NextResponse | null {
  if (!isEdgeRouteGroupEnabled("auth")) return null;

  const pathname = request.nextUrl.pathname;
  const match = matchAuthPrecheckRoute(pathname);
  if (!match) return null;

  const t0 = Date.now();
  const correlationId = resolveCorrelationId(request);
  const result = runAuthPrecheckEdgeFromCookies(request.cookies.getAll(), pathname);

  const latencyMs = Date.now() - t0;
  if (result.outcome === "handled") {
    const res = buildHandledResponse(result, NextResponse.next(), {
      correlationId,
      handlerId: match.handlerId,
      pathname,
      method: request.method,
      latencyMs,
    });
    return attachRdrRouteClass(res, request);
  }
  return null;
}

/** Route-specific edge handlers after proxy auth — returns handled response or pass-through with headers. */
export async function tryEdgeRoute(
  request: NextRequest,
  baseResponse: NextResponse,
): Promise<NextResponse | null> {
  if (!isEdgeLayerEnabled()) return null;

  const pathname = request.nextUrl.pathname;
  const match = matchEdgeRoute(pathname, request.method);
  if (!match || match.eligibility !== "EDGE_SAFE") return null;
  if (!isEdgeRouteGroupEnabled(match.group)) return null;

  const t0 = Date.now();
  const correlationId = resolveCorrelationId(request);
  const result = await dispatchHandler(match.handlerId, request);
  const latencyMs = Date.now() - t0;

  const meta = {
    correlationId,
    handlerId: match.handlerId,
    pathname,
    method: request.method,
    latencyMs,
  };

  if (result.outcome === "handled") {
    return attachRdrRouteClass(buildHandledResponse(result, baseResponse, meta), request);
  }
  return attachRdrRouteClass(buildFallbackResponse(request, result, baseResponse, meta), request);
}
