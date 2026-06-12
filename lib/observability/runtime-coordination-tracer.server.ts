import "server-only";

import { isRuntimeCoordinationTraceEnabled } from "@/lib/observability/config";
import { gestionaleLogger } from "@/lib/observability/logger";
import type { TraceRuntimeCoordinationInput } from "@/lib/observability/runtime-coordination-tracer";

const SERVER_RING_MAX = 50;
const serverRing: Array<TraceRuntimeCoordinationInput & { iso: string }> = [];

export function readCorrelationIdFromRequest(request: Request): string | undefined {
  return request.headers.get("X-Correlation-Id")?.trim() || undefined;
}

export function traceRuntimeCoordinationServer(input: TraceRuntimeCoordinationInput): void {
  if (!isRuntimeCoordinationTraceEnabled()) return;

  const entry = { ...input, iso: new Date().toISOString() };
  if (serverRing.length >= SERVER_RING_MAX) serverRing.shift();
  serverRing.push(entry);

  gestionaleLogger.debug("runtime.coordination", {
    operation: "cache",
    meta: {
      type: input.type,
      correlationId: input.correlationId,
      entityType: input.entityType,
      entityId: input.entityId?.slice(0, 36),
      scope: input.scope,
      layer: input.layer,
      ...input.meta,
    },
  });
}
