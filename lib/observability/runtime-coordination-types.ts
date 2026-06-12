export const RUNTIME_COORDINATION_EVENT_TYPES = [
  "mutation_started",
  "mic_invalidation_triggered",
  "react_query_invalidated",
  "server_cache_hit",
  "server_cache_miss",
  "asset_regenerated",
  "ui_render_completed",
] as const;

export type RuntimeCoordinationEventType = (typeof RUNTIME_COORDINATION_EVENT_TYPES)[number];

export type RuntimeCoordinationEvent = {
  type: RuntimeCoordinationEventType;
  ts: number;
  iso: string;
  correlationId: string;
  entityType?: string;
  entityId?: string;
  scope?: string;
  layer?: string;
  meta?: Record<string, unknown>;
  durationMs?: number;
};

export type RuntimeTraceFilter = {
  correlationId?: string;
  entityId?: string;
  limit?: number;
};

export const RUNTIME_TRACE_RING_MAX = 200;
