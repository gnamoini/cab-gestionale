"use client";

import { useEffect } from "react";
import { isQueryDedupAuditEnabled } from "@/lib/observability/config";
import {
  getDedupAuditEvents,
  getDedupAuditStats,
  resetDedupAudit,
} from "@/lib/observability/query-dedup-audit";
import { getActiveDedupEntries, resetDedupRegistry } from "@/lib/query/query-dedup-registry";
import { getDedupFetchSkips, dumpQueryFetchCounts } from "@/lib/observability/query-fetch-counter";

export type GestionaleQueryDedupDebug = {
  report: () => void;
  hits: typeof getDedupAuditStats;
  events: typeof getDedupAuditEvents;
  inFlight: typeof getActiveDedupEntries;
  networkFetches: typeof dumpQueryFetchCounts;
  dedupSkips: typeof getDedupFetchSkips;
  reset: () => void;
};

declare global {
  interface Window {
    __GESTIONALE_QUERY_DEDUP__?: GestionaleQueryDedupDebug;
  }
}

function printDedupReport(): void {
  const stats = getDedupAuditStats();
  console.groupCollapsed("[QueryDedup] report");
  console.table(stats);
  console.table(dumpQueryFetchCounts().slice(0, 20));
  console.log("in-flight", getActiveDedupEntries().size);
  console.log("dedup fetch skips", getDedupFetchSkips());
  console.groupEnd();
}

function resetAll(): void {
  resetDedupAudit();
  resetDedupRegistry();
}

export function mountQueryDedupDebug(): void {
  if (!isQueryDedupAuditEnabled()) return;
  if (typeof window === "undefined") return;
  window.__GESTIONALE_QUERY_DEDUP__ = {
    report: printDedupReport,
    hits: getDedupAuditStats,
    events: getDedupAuditEvents,
    inFlight: getActiveDedupEntries,
    networkFetches: dumpQueryFetchCounts,
    dedupSkips: getDedupFetchSkips,
    reset: resetAll,
  };
}

export function QueryDedupDebugMount() {
  useEffect(() => {
    mountQueryDedupDebug();
  }, []);
  return null;
}
