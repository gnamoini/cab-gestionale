"use client";

import type { Query, QueryCacheNotifyEvent } from "@tanstack/react-query";
import { getClientDeviceHints } from "@/lib/observability/client-device-hints";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

const QUERY_STUCK_MS = 15_000;
const EMIT_COOLDOWN_MS = 30_000;

const fetchStartedAt = new Map<string, number>();
const lastEmittedAt = new Map<string, number>();

function queryHash(query: Query): string {
  try {
    return JSON.stringify(query.queryKey);
  } catch {
    return String(query.queryKey);
  }
}

function truncateKey(key: string, max = 240): string {
  return key.length <= max ? key : `${key.slice(0, max)}…`;
}

export function trackQueryCacheEventForStuck(
  event: QueryCacheNotifyEvent,
  getRoute: () => string,
): void {
  if (event.type !== "added" && event.type !== "updated" && event.type !== "removed") return;
  const query = event.query;
  const hash = queryHash(query);

  if (event.type === "removed" || query.state.fetchStatus !== "fetching") {
    fetchStartedAt.delete(hash);
    return;
  }

  if (!fetchStartedAt.has(hash)) {
    fetchStartedAt.set(hash, Date.now());
  }

  const startedAt = fetchStartedAt.get(hash) ?? Date.now();
  const fetchDuration = Date.now() - startedAt;
  if (fetchDuration < QUERY_STUCK_MS) return;

  const lastEmit = lastEmittedAt.get(hash) ?? 0;
  if (Date.now() - lastEmit < EMIT_COOLDOWN_MS) return;
  lastEmittedAt.set(hash, Date.now());

  const hints = getClientDeviceHints();
  trackRuntimeEvent(RuntimeEvents.queryStuck, {
    durationMs: fetchDuration,
    queryKey: truncateKey(hash),
    queryStartedAt: startedAt,
    queryFetchDuration: fetchDuration,
    route: getRoute(),
    browser: hints.browser,
    hardwareConcurrency: hints.hardwareConcurrency,
    deviceMemory: hints.deviceMemory,
    status: query.state.status,
    fetchStatus: query.state.fetchStatus,
  });
}

export function resetQueryStuckTracker(): void {
  fetchStartedAt.clear();
  lastEmittedAt.clear();
}
