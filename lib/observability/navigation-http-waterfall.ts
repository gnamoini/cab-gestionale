/**
 * HTTP waterfall per navigazione client — richieste effettive, non solo queryKey RQ.
 */

import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";

export type WaterfallRequestKind = "rsc" | "settings" | "core" | "view" | "other";

export type WaterfallRequest = {
  url: string;
  kind: WaterfallRequestKind;
  startMs: number;
  endMs?: number;
  durationMs?: number;
};

export type NavigationWaterfallSummary = {
  route: string;
  requestCount: number;
  duplicateCount: number;
  serializedChainCount: number;
  byKind: Record<WaterfallRequestKind, number>;
  navToInteractiveMs?: number;
  requests: readonly WaterfallRequest[];
};

const MAX_REQUESTS = 200;
let activeRoute = "";
let navigationStartMs = 0;
let interactiveAtMs: number | undefined;
const requests: WaterfallRequest[] = [];
let observer: PerformanceObserver | null = null;
let fetchPatched = false;

function enabled(): boolean {
  return isNavigationBootDiagnosticsEnabled();
}

function classifyUrl(url: string): WaterfallRequestKind {
  const lower = url.toLowerCase();
  if (lower.includes("_rsc") || lower.includes("__rsc")) return "rsc";
  if (lower.includes("/rest/v1/app_settings") || lower.includes("app_settings")) return "settings";
  if (lower.includes("/api/bff/") || lower.includes("/api/lavorazioni") || lower.includes("/api/magazzino")) {
    return "core";
  }
  if (lower.includes("/rest/v1/") || lower.includes("/api/")) return "view";
  return "other";
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

function recordRequest(url: string, startMs: number, endMs: number): void {
  if (!enabled()) return;
  const kind = classifyUrl(url);
  requests.push({
    url: normalizeUrl(url),
    kind,
    startMs,
    endMs,
    durationMs: endMs - startMs,
  });
  if (requests.length > MAX_REQUESTS) requests.shift();
}

function countDuplicates(routeRequests: WaterfallRequest[]): number {
  const counts = new Map<string, number>();
  for (const r of routeRequests) {
    const key = `${r.kind}:${r.url}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let dup = 0;
  for (const n of counts.values()) {
    if (n > 1) dup += n - 1;
  }
  return dup;
}

function countSerializedChains(routeRequests: WaterfallRequest[]): number {
  const sorted = [...routeRequests].filter((r) => r.endMs != null).sort((a, b) => a.startMs - b.startMs);
  let chains = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.endMs != null && cur.startMs - prev.endMs > 1) chains += 1;
  }
  return chains;
}

export function beginNavigationWaterfall(route: string): void {
  if (!enabled()) return;
  activeRoute = route;
  navigationStartMs = performance.now();
  interactiveAtMs = undefined;
  requests.length = 0;
}

export function markNavigationInteractive(): void {
  if (!enabled()) return;
  interactiveAtMs = performance.now();
}

export function summarizeNavigationWaterfall(): NavigationWaterfallSummary {
  const routeRequests = [...requests];
  const byKind: Record<WaterfallRequestKind, number> = {
    rsc: 0,
    settings: 0,
    core: 0,
    view: 0,
    other: 0,
  };
  for (const r of routeRequests) byKind[r.kind] += 1;

  return {
    route: activeRoute,
    requestCount: routeRequests.length,
    duplicateCount: countDuplicates(routeRequests),
    serializedChainCount: countSerializedChains(routeRequests),
    byKind,
    navToInteractiveMs:
      interactiveAtMs != null && navigationStartMs > 0 ? interactiveAtMs - navigationStartMs : undefined,
    requests: routeRequests,
  };
}

export function exposeNavigationWaterfall(): void {
  if (typeof window === "undefined" || !enabled()) return;
  (window as Window & { __cabNavHttpWaterfall?: NavigationWaterfallSummary }).__cabNavHttpWaterfall =
    summarizeNavigationWaterfall();
}

function onResourceEntry(entry: PerformanceResourceTiming): void {
  if (!enabled() || navigationStartMs === 0) return;
  const startMs = entry.startTime;
  const endMs = entry.responseEnd;
  if (endMs <= 0) return;
  recordRequest(entry.name, startMs, endMs);
}

export function ensureNavigationHttpWaterfallInstrumentation(): void {
  if (!enabled() || typeof window === "undefined") return;

  if (!observer && typeof PerformanceObserver !== "undefined") {
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") onResourceEntry(entry as PerformanceResourceTiming);
        }
      });
      observer.observe({ type: "resource", buffered: true });
    } catch {
      observer = null;
    }
  }

  if (!fetchPatched) {
    fetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startMs = performance.now();
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      try {
        const res = await originalFetch(input, init);
        recordRequest(url, startMs, performance.now());
        return res;
      } catch (e) {
        recordRequest(url, startMs, performance.now());
        throw e;
      }
    };
  }
}

export function disposeNavigationHttpWaterfall(): void {
  observer?.disconnect();
  observer = null;
}
