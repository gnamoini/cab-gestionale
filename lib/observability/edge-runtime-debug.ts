"use client";

import { useEffect } from "react";
import { isEdgeRuntimeTraceEnabled } from "@/lib/observability/config";
import {
  getEdgeRuntimeEvents,
  getEdgeRuntimeStats,
  recordEdgeRuntimeFromResponseHeaders,
  resetEdgeRuntimeStats,
} from "@/lib/observability/edge-runtime-tracer";

export type EdgeRuntimeStatsDebug = {
  report: () => void;
  stats: typeof getEdgeRuntimeStats;
  events: typeof getEdgeRuntimeEvents;
  reset: typeof resetEdgeRuntimeStats;
};

declare global {
  interface Window {
    __EDGE_RUNTIME_STATS__?: EdgeRuntimeStatsDebug;
  }
}

let fetchHookInstalled = false;

function installEdgeFetchHook(): void {
  if (fetchHookInstalled || typeof window === "undefined") return;
  if (!isEdgeRuntimeTraceEnabled()) return;
  fetchHookInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await nativeFetch(input, init);
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/")) {
        const u = new URL(url, window.location.origin);
        recordEdgeRuntimeFromResponseHeaders({
          pathname: u.pathname,
          method: init?.method ?? "GET",
          headers: res.headers,
        });
      }
    } catch {
      // ignore hook errors
    }
    return res;
  };
}

function printEdgeReport(): void {
  const stats = getEdgeRuntimeStats();
  console.groupCollapsed("[EdgeRuntime] report");
  console.table(stats);
  console.table(getEdgeRuntimeEvents().slice(-20));
  console.groupEnd();
}

export function mountEdgeRuntimeDebug(): void {
  if (!isEdgeRuntimeTraceEnabled()) return;
  if (typeof window === "undefined") return;
  installEdgeFetchHook();
  window.__EDGE_RUNTIME_STATS__ = {
    report: printEdgeReport,
    stats: getEdgeRuntimeStats,
    events: getEdgeRuntimeEvents,
    reset: resetEdgeRuntimeStats,
  };
}

export function EdgeRuntimeDebugMount() {
  useEffect(() => {
    mountEdgeRuntimeDebug();
  }, []);
  return null;
}
