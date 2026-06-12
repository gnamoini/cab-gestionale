"use client";

import { isRuntimeCoordinationTraceEnabled } from "@/lib/observability/config";
import { runWithCorrelationIdAsync } from "@/lib/observability/runtime-correlation-context";
import {
  createCorrelationId,
  traceRuntimeCoordination,
} from "@/lib/observability/runtime-coordination-tracer";

export type TraceMutationLifecycleMeta = {
  entityType: string;
  entityId: string;
  operation: string;
  scope?: string;
};

export async function traceMutationLifecycle<T>(
  meta: TraceMutationLifecycleMeta,
  run: () => Promise<T>,
): Promise<T> {
  if (!isRuntimeCoordinationTraceEnabled()) {
    return run();
  }

  const correlationId = createCorrelationId();
  traceRuntimeCoordination({
    type: "mutation_started",
    correlationId,
    entityType: meta.entityType,
    entityId: meta.entityId,
    scope: meta.scope ?? "detail",
    layer: "mutation",
    meta: { operation: meta.operation },
  });

  return runWithCorrelationIdAsync(correlationId, run);
}
