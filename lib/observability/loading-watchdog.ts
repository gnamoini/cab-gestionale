"use client";

import type { Query, QueryClient } from "@tanstack/react-query";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";

const POLL_MS = 2_000;
const STUCK_MS = 10_000;

export type LoadingWatchdogReport = {
  exportedAt: string;
  route: string;
  stuckQueries: Array<{
    queryKey: unknown;
    status: string;
    fetchStatus: string;
    pendingMs: number;
  }>;
};

function collectStuckQueries(client: QueryClient, minPendingMs: number): LoadingWatchdogReport["stuckQueries"] {
  const now = Date.now();
  return client
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.fetchStatus === "fetching")
    .map((q) => {
      const started = fetchStartedAtForQuery(q, now);
      const pendingMs = now - started;
      return {
        queryKey: q.queryKey,
        status: q.state.status,
        fetchStatus: q.state.fetchStatus,
        pendingMs,
      };
    })
    .filter((row) => row.pendingMs >= minPendingMs);
}

function fetchStartedAtForQuery(q: Query, now: number): number {
  const updated = q.state.dataUpdatedAt || q.state.errorUpdatedAt;
  if (updated > 0) return updated;
  return now - STUCK_MS;
}

export function exportLoadingWatchdogReport(
  client: QueryClient,
  route: string,
  minPendingMs = STUCK_MS,
): LoadingWatchdogReport {
  return {
    exportedAt: new Date().toISOString(),
    route,
    stuckQueries: collectStuckQueries(client, minPendingMs),
  };
}

export function mountLoadingWatchdog(
  client: QueryClient,
  getRoute: () => string,
): () => void {
  if (!isBootInvestigationEnabled()) return () => undefined;

  const id = window.setInterval(() => {
    const stuck = collectStuckQueries(client, STUCK_MS);
    if (stuck.length === 0) return;
    console.warn("[loading-watchdog] stuck queries", {
      route: getRoute(),
      count: stuck.length,
      stuck: stuck.slice(0, 5),
    });
  }, POLL_MS);

  const win = window as Window & {
    __cabLoadingWatchdogReport?: (minPendingMs?: number) => LoadingWatchdogReport;
  };
  win.__cabLoadingWatchdogReport = (minPendingMs = STUCK_MS) =>
    exportLoadingWatchdogReport(client, getRoute(), minPendingMs);

  return () => {
    window.clearInterval(id);
    delete win.__cabLoadingWatchdogReport;
  };
}
