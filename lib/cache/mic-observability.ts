import type { MicEntityType, MicScope } from "@/lib/cache/mic-types";
import { isRuntimeCoordinationTraceEnabled } from "@/lib/observability/config";
import { gestionaleLogger } from "@/lib/observability/logger";

const counters = new Map<MicEntityType, number>();

export function recordMicInvalidation(entityType: MicEntityType): void {
  counters.set(entityType, (counters.get(entityType) ?? 0) + 1);
}

export function getMicInvalidationCounters(): Readonly<Record<string, number>> {
  return Object.fromEntries(counters.entries());
}

export function logMicInvalidation(input: {
  entityType: MicEntityType;
  entityId: string;
  scope: MicScope;
  correlationId?: string;
}): void {
  if (isRuntimeCoordinationTraceEnabled()) return;
  if (process.env.NODE_ENV !== "development") return;
  gestionaleLogger.debug("mic.invalidate", {
    operation: "cache",
    meta: {
      entityType: input.entityType,
      entityId: input.entityId.slice(0, 36),
      scope: input.scope,
      correlationId: input.correlationId,
    },
  });
}
