import type { LogLevel } from "@/lib/observability/types";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function parseLogLevel(raw: string | undefined): LogLevel | null {
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return null;
}

export function getMinLogLevel(): LogLevel {
  const fromEnv = parseLogLevel(process.env.NEXT_PUBLIC_OBS_LOG_LEVEL?.trim());
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function shouldLogLevel(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[getMinLogLevel()];
}

export function isObsPerfEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OBS_PERF === "1";
}

/** Dev-only runtime coordination tracing (mutation → MIC → cache → assets). */
export function isRuntimeCoordinationTraceEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_RUNTIME_COORDINATION_TRACE === "1") return true;
  return process.env.NODE_ENV === "development";
}

/** Dev-only unified asset cache hit-ratio telemetry (PDF, thumbnails, images, documents). */
export function isAssetCacheTelemetryEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_ASSET_CACHE_TELEMETRY === "1") return true;
  return process.env.NODE_ENV === "development";
}

/** Dev-only asset cache warmup (prefetch after MISS / MIC invalidation). */
export function isAssetCacheWarmupEnabled(): boolean {
  if (!isAssetCacheTelemetryEnabled()) return false;
  return process.env.NEXT_PUBLIC_ASSET_CACHE_WARMUP !== "0";
}

/** Dev-only SSR hydration / query key consistency audit. */
export function isHydrationConsistencyAuditEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_HYDRATION_CONSISTENCY_AUDIT === "1") return true;
  return process.env.NODE_ENV === "development";
}

/** Dev-only in-flight query deduplication audit (complements React Query native dedup). */
export function isQueryDedupAuditEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_QUERY_DEDUP_AUDIT === "0") return false;
  return process.env.NODE_ENV === "development";
}

/** Edge decision layer in proxy/middleware (lightweight prechecks, no DB). */
export function isEdgeLayerEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_EDGE_LAYER === "0") return false;
  return process.env.NODE_ENV === "development";
}

const EDGE_GROUP_ENV: Record<string, string> = {
  auth: "NEXT_PUBLIC_EDGE_AUTH",
  documents: "NEXT_PUBLIC_EDGE_DOCUMENTS",
  media: "NEXT_PUBLIC_EDGE_MEDIA",
  upload: "NEXT_PUBLIC_EDGE_UPLOAD",
};

/** Per-route-group edge handler gate (requires master isEdgeLayerEnabled). */
export function isEdgeRouteGroupEnabled(group: "auth" | "documents" | "media" | "upload"): boolean {
  if (!isEdgeLayerEnabled()) return false;
  const envKey = EDGE_GROUP_ENV[group];
  const raw = process.env[envKey]?.trim();
  if (raw === "0") return false;
  if (raw === "1") return true;
  return true;
}

/** Dev-only edge runtime tracing (hit/miss/fallback in middleware). */
export function isEdgeRuntimeTraceEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_EDGE_RUNTIME_TRACE === "0") return false;
  return process.env.NODE_ENV === "development";
}

/** Dev-only Request Decision Registry audit (edge vs server alignment). */
export function isRequestDecisionAuditEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_REQUEST_DECISION_AUDIT === "0") return false;
  return process.env.NODE_ENV === "development";
}
