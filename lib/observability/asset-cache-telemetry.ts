import { isAssetCacheTelemetryEnabled } from "@/lib/observability/config";

export const ASSET_CACHE_RING_MAX = 200;
export const ASSET_CACHE_HOTSPOT_MAX = 20;

export const ASSET_CACHE_TYPES = ["pdf", "document", "image", "thumbnail"] as const;
export type AssetCacheType = (typeof ASSET_CACHE_TYPES)[number];

export const ASSET_CACHE_STATUSES = ["HIT", "MISS", "REVALIDATED"] as const;
export type AssetCacheStatus = (typeof ASSET_CACHE_STATUSES)[number];

export const ASSET_CACHE_SOURCES = ["storage", "generated", "proxy"] as const;
export type AssetCacheSource = (typeof ASSET_CACHE_SOURCES)[number];

export type AssetCacheAccessEvent = {
  assetType: AssetCacheType;
  cacheStatus: AssetCacheStatus;
  entityType?: string;
  entityId?: string;
  latencyMs: number;
  source: AssetCacheSource;
  correlationId?: string;
  meta?: Record<string, unknown>;
  ts: number;
};

export type AssetCacheAccessInput = Omit<AssetCacheAccessEvent, "ts">;

export type AssetCacheEventFilter = {
  assetType?: AssetCacheType;
  entityType?: string;
  entityId?: string;
  cacheStatus?: AssetCacheStatus;
  limit?: number;
};

type AssetTypeCounters = {
  hit: number;
  miss: number;
  revalidated: number;
  totalLatencyMs: number;
  count: number;
};

type EntityCounters = {
  hit: number;
  miss: number;
  revalidated: number;
};

const ring: AssetCacheAccessEvent[] = [];
const byAssetType = new Map<AssetCacheType, AssetTypeCounters>();
const byEntityType = new Map<string, EntityCounters>();
const missHotspots = new Map<string, { count: number; lastAt: number; sample: AssetCacheAccessInput }>();

function emptyAssetCounters(): AssetTypeCounters {
  return { hit: 0, miss: 0, revalidated: 0, totalLatencyMs: 0, count: 0 };
}

function emptyEntityCounters(): EntityCounters {
  return { hit: 0, miss: 0, revalidated: 0 };
}

function hotspotKey(event: AssetCacheAccessInput): string {
  const entity = event.entityId ? `${event.entityType ?? "?"}:${event.entityId}` : "global";
  const metaKey =
    event.meta?.pdfType != null ? String(event.meta.pdfType) : event.meta?.path != null ? String(event.meta.path) : "";
  return `${event.assetType}:${entity}${metaKey ? `:${metaKey}` : ""}`;
}

function bumpAssetCounters(counters: AssetTypeCounters, status: AssetCacheStatus, latencyMs: number): void {
  if (status === "HIT") counters.hit += 1;
  else if (status === "MISS") counters.miss += 1;
  else counters.revalidated += 1;
  counters.totalLatencyMs += latencyMs;
  counters.count += 1;
}

function bumpEntityCounters(counters: EntityCounters, status: AssetCacheStatus): void {
  if (status === "HIT") counters.hit += 1;
  else if (status === "MISS") counters.miss += 1;
  else counters.revalidated += 1;
}

export function recordAssetCacheAccess(input: AssetCacheAccessInput): void {
  if (!isAssetCacheTelemetryEnabled()) return;

  const event: AssetCacheAccessEvent = { ...input, ts: Date.now() };
  if (ring.length >= ASSET_CACHE_RING_MAX) ring.shift();
  ring.push(event);

  const assetCounters = byAssetType.get(event.assetType) ?? emptyAssetCounters();
  bumpAssetCounters(assetCounters, event.cacheStatus, event.latencyMs);
  byAssetType.set(event.assetType, assetCounters);

  if (event.entityType) {
    const entityCounters = byEntityType.get(event.entityType) ?? emptyEntityCounters();
    bumpEntityCounters(entityCounters, event.cacheStatus);
    byEntityType.set(event.entityType, entityCounters);
  }

  if (event.cacheStatus === "MISS") {
    const key = hotspotKey(input);
    const existing = missHotspots.get(key);
    missHotspots.set(key, {
      count: (existing?.count ?? 0) + 1,
      lastAt: event.ts,
      sample: input,
    });
    if (missHotspots.size > ASSET_CACHE_HOTSPOT_MAX * 2) {
      const sorted = [...missHotspots.entries()].sort((a, b) => b[1].count - a[1].count);
      missHotspots.clear();
      for (const [k, v] of sorted.slice(0, ASSET_CACHE_HOTSPOT_MAX)) {
        missHotspots.set(k, v);
      }
    }
  }
}

function ratioFromCounters(hit: number, miss: number, revalidated: number): number {
  const total = hit + miss + revalidated;
  if (total === 0) return 0;
  return Math.round((hit / total) * 1000) / 1000;
}

export function getCacheHitRatio(assetType?: AssetCacheType): number {
  if (!isAssetCacheTelemetryEnabled()) return 0;
  if (!assetType) {
    let hit = 0;
    let miss = 0;
    let revalidated = 0;
    for (const c of byAssetType.values()) {
      hit += c.hit;
      miss += c.miss;
      revalidated += c.revalidated;
    }
    return ratioFromCounters(hit, miss, revalidated);
  }
  const c = byAssetType.get(assetType) ?? emptyAssetCounters();
  return ratioFromCounters(c.hit, c.miss, c.revalidated);
}

export function getCacheHitRatioByEntity(entityType: string): number {
  if (!isAssetCacheTelemetryEnabled()) return 0;
  const c = byEntityType.get(entityType) ?? emptyEntityCounters();
  return ratioFromCounters(c.hit, c.miss, c.revalidated);
}

export function getAverageAssetLatency(assetType?: AssetCacheType): number {
  if (!isAssetCacheTelemetryEnabled()) return 0;
  if (!assetType) {
    let totalLatencyMs = 0;
    let count = 0;
    for (const c of byAssetType.values()) {
      totalLatencyMs += c.totalLatencyMs;
      count += c.count;
    }
    return count === 0 ? 0 : Math.round(totalLatencyMs / count);
  }
  const c = byAssetType.get(assetType) ?? emptyAssetCounters();
  return c.count === 0 ? 0 : Math.round(c.totalLatencyMs / c.count);
}

export function getAssetCacheEvents(filter?: AssetCacheEventFilter): AssetCacheAccessEvent[] {
  if (!isAssetCacheTelemetryEnabled()) return [];
  let out = [...ring];
  if (filter?.assetType) out = out.filter((e) => e.assetType === filter.assetType);
  if (filter?.entityType) out = out.filter((e) => e.entityType === filter.entityType);
  if (filter?.entityId) out = out.filter((e) => e.entityId === filter.entityId);
  if (filter?.cacheStatus) out = out.filter((e) => e.cacheStatus === filter.cacheStatus);
  out.reverse();
  return out.slice(0, filter?.limit ?? 100);
}

export function getAssetHotspots(limit = 10): Array<{ key: string; count: number; lastAt: number; sample: AssetCacheAccessInput }> {
  if (!isAssetCacheTelemetryEnabled()) return [];
  return [...missHotspots.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getAssetCacheSummary(): Array<{
  assetType: AssetCacheType;
  hit: number;
  miss: number;
  revalidated: number;
  ratio: number;
  avgLatencyMs: number;
}> {
  if (!isAssetCacheTelemetryEnabled()) return [];
  return ASSET_CACHE_TYPES.map((assetType) => {
    const c = byAssetType.get(assetType) ?? emptyAssetCounters();
    return {
      assetType,
      hit: c.hit,
      miss: c.miss,
      revalidated: c.revalidated,
      ratio: ratioFromCounters(c.hit, c.miss, c.revalidated),
      avgLatencyMs: c.count === 0 ? 0 : Math.round(c.totalLatencyMs / c.count),
    };
  }).filter((row) => row.hit + row.miss + row.revalidated > 0);
}

export function resetAssetCacheTelemetry(entityType?: string): void {
  if (!entityType) {
    ring.length = 0;
    byAssetType.clear();
    byEntityType.clear();
    missHotspots.clear();
    return;
  }
  for (let i = ring.length - 1; i >= 0; i -= 1) {
    if (ring[i]?.entityType === entityType) ring.splice(i, 1);
  }
  byEntityType.delete(entityType);
}

export function printCacheReport(): void {
  if (!isAssetCacheTelemetryEnabled() || typeof console === "undefined") return;
  const summary = getAssetCacheSummary();
  const overall = {
    ratio: getCacheHitRatio(),
    avgLatencyMs: getAverageAssetLatency(),
    events: ring.length,
  };
  console.groupCollapsed("[AssetCache] report");
  console.log("overall", overall);
  if (summary.length > 0) console.table(summary);
  const entityRows = [...byEntityType.entries()].map(([entityType, c]) => ({
    entityType,
    hit: c.hit,
    miss: c.miss,
    revalidated: c.revalidated,
    ratio: ratioFromCounters(c.hit, c.miss, c.revalidated),
  }));
  if (entityRows.length > 0) console.table(entityRows);
  console.groupEnd();
}

export function printAssetHotspots(): void {
  if (!isAssetCacheTelemetryEnabled() || typeof console === "undefined") return;
  const hotspots = getAssetHotspots();
  console.groupCollapsed("[AssetCache] hotspots (MISS)");
  if (hotspots.length === 0) console.log("no MISS hotspots recorded");
  else console.table(hotspots.map((h) => ({ key: h.key, count: h.count, lastAt: new Date(h.lastAt).toISOString() })));
  console.groupEnd();
}
