import { isEdgeRuntimeTraceEnabled } from "@/lib/observability/config";
import type { EdgeHandlerId } from "@/lib/edge/edge-types";

export type EdgeRuntimeEventType = "edge_hit" | "edge_miss";

export type EdgeRuntimeHandlerId = EdgeHandlerId | "client_observed";

export type EdgeRuntimeEvent = {
  type: EdgeRuntimeEventType;
  handlerId: EdgeRuntimeHandlerId;
  pathname: string;
  method: string;
  decision: "hit" | "fallback";
  fallbackReason?: string;
  latencyMs?: number;
  latencySavedEstimate?: number;
  correlationId?: string;
  at: number;
};

const RING_SIZE = 100;

let edgeHits = 0;
let edgeMisses = 0;
const events: EdgeRuntimeEvent[] = [];

function pushEvent(event: EdgeRuntimeEvent): void {
  if (!isEdgeRuntimeTraceEnabled()) return;
  events.push(event);
  if (events.length > RING_SIZE) events.shift();
}

export function recordEdgeRuntimeEvent(input: Omit<EdgeRuntimeEvent, "at">): void {
  if (!isEdgeRuntimeTraceEnabled()) return;
  if (input.decision === "hit") edgeHits += 1;
  else edgeMisses += 1;
  pushEvent({ ...input, at: Date.now() });
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[Edge] ${input.decision.toUpperCase()} ${input.handlerId} ${input.pathname} ${input.fallbackReason ?? ""}`.trim(),
    );
  }
}

export function recordEdgeRuntimeFromResponseHeaders(input: {
  pathname: string;
  method: string;
  headers: Headers;
}): void {
  if (!isEdgeRuntimeTraceEnabled()) return;
  const decision = input.headers.get("X-Edge-Decision");
  if (decision !== "hit" && decision !== "fallback") return;
  const handlerId = input.headers.get("X-Edge-Handler") as EdgeHandlerId | null;
  recordEdgeRuntimeEvent({
    type: decision === "hit" ? "edge_hit" : "edge_miss",
    handlerId: handlerId ?? "client_observed",
    pathname: input.pathname,
    method: input.method,
    decision,
    fallbackReason: input.headers.get("X-Edge-Fallback-Reason") ?? undefined,
    latencySavedEstimate: Number(input.headers.get("X-Edge-Latency-Saved") ?? "") || undefined,
    correlationId: input.headers.get("X-Correlation-Id") ?? undefined,
  });
}

export function getEdgeRuntimeStats(): {
  edgeHits: number;
  edgeMisses: number;
  total: number;
} {
  return { edgeHits, edgeMisses, total: edgeHits + edgeMisses };
}

export function getEdgeRuntimeEvents(): readonly EdgeRuntimeEvent[] {
  return events;
}

export function resetEdgeRuntimeStats(): void {
  edgeHits = 0;
  edgeMisses = 0;
  events.length = 0;
}
