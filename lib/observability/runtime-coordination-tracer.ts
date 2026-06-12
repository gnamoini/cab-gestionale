import { isRuntimeCoordinationTraceEnabled } from "@/lib/observability/config";
import { getActiveCorrelationId } from "@/lib/observability/runtime-correlation-context";
import type {
  RuntimeCoordinationEvent,
  RuntimeCoordinationEventType,
  RuntimeTraceFilter,
} from "@/lib/observability/runtime-coordination-types";
import { RUNTIME_TRACE_RING_MAX } from "@/lib/observability/runtime-coordination-types";

export type {
  RuntimeCoordinationEvent,
  RuntimeCoordinationEventType,
  RuntimeTraceFilter,
} from "@/lib/observability/runtime-coordination-types";

export { RUNTIME_TRACE_RING_MAX };

const ring: RuntimeCoordinationEvent[] = [];
const lastEventByCorrelation = new Map<string, number>();
const groupLogged = new Set<string>();

export function createCorrelationId(prefix = "rc"): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`;
}

export type TraceRuntimeCoordinationInput = Omit<
  RuntimeCoordinationEvent,
  "ts" | "iso" | "durationMs" | "correlationId"
> & {
  correlationId?: string;
  durationMs?: number;
};

export function traceRuntimeCoordination(input: TraceRuntimeCoordinationInput): void {
  if (!isRuntimeCoordinationTraceEnabled()) return;

  const correlationId = input.correlationId ?? getActiveCorrelationId() ?? "orphan";
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const prev = lastEventByCorrelation.get(correlationId);
  const durationMs = input.durationMs ?? (prev != null ? Math.round(now - prev) : undefined);

  const event: RuntimeCoordinationEvent = {
    type: input.type,
    ts: now,
    iso: new Date().toISOString(),
    correlationId,
    entityType: input.entityType,
    entityId: input.entityId,
    scope: input.scope,
    layer: input.layer,
    meta: input.meta,
    durationMs,
  };

  if (ring.length >= RUNTIME_TRACE_RING_MAX) {
    ring.shift();
  }
  ring.push(event);
  lastEventByCorrelation.set(correlationId, now);

  logCollapsedGroup(event);
}

function logCollapsedGroup(event: RuntimeCoordinationEvent): void {
  if (typeof console === "undefined" || !console.groupCollapsed) return;

  const key = event.correlationId;
  const events = ring.filter((e) => e.correlationId === key);
  if (events.length === 1 && !groupLogged.has(key)) {
    groupLogged.add(key);
    if (groupLogged.size > 50) groupLogged.clear();
  }

  const label = formatEventLine(event);
  const entity = event.entityType && event.entityId ? `${event.entityType}:${event.entityId.slice(0, 12)}` : "—";
  if (events.length <= 1) {
    console.groupCollapsed(`[RC] ${entity} (${key})`);
    console.log(label);
    console.groupEnd();
    return;
  }

  if (events[events.length - 1] === event) {
    console.groupCollapsed(`[RC] ${entity} (${key}) — ${events.length} events`);
    for (const e of events) {
      console.log(formatEventLine(e));
    }
    console.groupEnd();
  }
}

function formatEventLine(event: RuntimeCoordinationEvent): string {
  const delta = event.durationMs != null ? ` (+${event.durationMs}ms)` : "";
  const scope = event.scope ? ` scope=${event.scope}` : "";
  const layer = event.layer ? ` layer=${event.layer}` : "";
  const meta =
    event.meta && Object.keys(event.meta).length > 0 ? ` ${JSON.stringify(event.meta)}` : "";
  return `${event.type}${delta}${scope}${layer}${meta}`;
}

export function getRuntimeTrace(filter?: RuntimeTraceFilter): RuntimeCoordinationEvent[] {
  if (!isRuntimeCoordinationTraceEnabled()) return [];
  let out = [...ring];
  if (filter?.correlationId) {
    out = out.filter((e) => e.correlationId === filter.correlationId);
  }
  if (filter?.entityId) {
    out = out.filter((e) => e.entityId === filter.entityId);
  }
  out.reverse();
  const limit = filter?.limit ?? 100;
  return out.slice(0, limit);
}

export function clearRuntimeTrace(): void {
  ring.length = 0;
  lastEventByCorrelation.clear();
  groupLogged.clear();
}

export function getRuntimeTraceSummary(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of ring) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

/** Schedules ui_render_completed after paint (double rAF). */
export function scheduleRuntimeTraceUiRender(correlationId: string, meta?: Record<string, unknown>): void {
  if (!isRuntimeCoordinationTraceEnabled()) return;
  if (typeof requestAnimationFrame === "undefined") return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      traceRuntimeCoordination({
        type: "ui_render_completed",
        correlationId,
        layer: "ui",
        meta,
      });
    });
  });
}
