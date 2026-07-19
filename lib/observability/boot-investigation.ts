/**
 * Dev-only boot investigation — tagged logging, loop detectors, export report.
 * Enable: NEXT_PUBLIC_BOOT_INVESTIGATION=1
 */

export type BootInvestigationTag =
  | "BOOT"
  | "MOUNT"
  | "UNMOUNT"
  | "AUTH"
  | "QUERY"
  | "REDIRECT"
  | "RENDER"
  | "STORE_UPDATE";

export type BootInvestigationEvent = {
  ts: string;
  atMs: number;
  tag: BootInvestigationTag;
  component: string;
  detail?: string;
  meta?: Record<string, unknown>;
};

export type LoopAlert = {
  kind: "render" | "redirect" | "query" | "store";
  component: string;
  count: number;
  windowMs: number;
  atMs: number;
};

const MAX_EVENTS = 2000;
const RENDER_LOOP_5S = 10;
const RENDER_LOOP_30S = 50;
const REDIRECT_LOOP_COUNT = 3;
const REDIRECT_LOOP_WINDOW_MS = 10_000;
const QUERY_LOOP_COUNT = 3;
const QUERY_LOOP_WINDOW_MS = 10_000;
const STORE_BURST_COUNT = 5;
const STORE_BURST_WINDOW_MS = 2_000;

function isEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_BOOT_INVESTIGATION === "1" ||
    process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS === "1"
  );
}

const events: BootInvestigationEvent[] = [];
const loopAlerts: LoopAlert[] = [];
const renderTimestamps = new Map<string, number[]>();
const redirectTimestamps = new Map<string, number[]>();
const queryFetchStarts = new Map<string, number[]>();
const storeUpdateTimestamps = new Map<string, number[]>();
const renderTotals = new Map<string, number>();
const consoleDedupe = new Map<string, number>();
const CONSOLE_DEDUPE_MS = 500;

function abbreviateStack(): string | undefined {
  if (typeof Error === "undefined") return undefined;
  const stack = new Error().stack;
  if (!stack) return undefined;
  return stack
    .split("\n")
    .slice(2, 6)
    .map((l) => l.trim())
    .join(" | ");
}

function pushEvent(event: BootInvestigationEvent): void {
  if (!isEnabled()) return;
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

function maybeConsoleLog(event: BootInvestigationEvent): void {
  if (!isEnabled()) return;
  const key = `${event.tag}:${event.component}:${event.detail ?? ""}`;
  const now = event.atMs;
  const last = consoleDedupe.get(key);
  if (last != null && now - last < CONSOLE_DEDUPE_MS) return;
  consoleDedupe.set(key, now);
  const line = `[${event.tag}] ${event.ts} ${event.component}${event.detail ? ` — ${event.detail}` : ""}`;
  if (event.meta && Object.keys(event.meta).length > 0) {
    console.debug(line, event.meta);
  } else {
    console.debug(line);
  }
}

export { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";

export function logBoot(
  tag: BootInvestigationTag,
  component: string,
  meta?: Record<string, unknown>,
  detail?: string,
): void {
  if (!isEnabled()) return;
  const atMs = Date.now();
  const event: BootInvestigationEvent = {
    ts: new Date(atMs).toISOString(),
    atMs,
    tag,
    component,
    detail,
    meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
  };
  pushEvent(event);
  maybeConsoleLog(event);
}

export function trackRedirect(
  from: string,
  to: string,
  reason: string,
  source: "edge" | "auth_gate" | "rbac" | "router",
): void {
  if (!isEnabled()) return;
  const pair = `${from}→${to}`;
  logBoot("REDIRECT", source, { from, to, reason }, pair);

  const now = Date.now();
  const key = pair;
  const prev = redirectTimestamps.get(key) ?? [];
  const recent = [...prev.filter((t) => now - t < REDIRECT_LOOP_WINDOW_MS), now];
  redirectTimestamps.set(key, recent);
  if (recent.length >= REDIRECT_LOOP_COUNT) {
    const alert: LoopAlert = {
      kind: "redirect",
      component: pair,
      count: recent.length,
      windowMs: REDIRECT_LOOP_WINDOW_MS,
      atMs: now,
    };
    loopAlerts.push(alert);
    console.warn(`[REDIRECT] LOOP_SUSPECT ${pair} x${recent.length} in ${REDIRECT_LOOP_WINDOW_MS}ms`);
  }
}

export function trackStoreUpdate(
  storeName: string,
  prev: unknown,
  next: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  const detail = `${String(prev)}→${String(next)}`;
  logBoot("STORE_UPDATE", storeName, { prev, next, ...meta }, detail);

  const now = Date.now();
  const prevTs = storeUpdateTimestamps.get(storeName) ?? [];
  const recent = [...prevTs.filter((t) => now - t < STORE_BURST_WINDOW_MS), now];
  storeUpdateTimestamps.set(storeName, recent);
  if (recent.length >= STORE_BURST_COUNT) {
    const stack = abbreviateStack();
    loopAlerts.push({
      kind: "store",
      component: storeName,
      count: recent.length,
      windowMs: STORE_BURST_WINDOW_MS,
      atMs: now,
    });
    console.warn(`[STORE_UPDATE] LOOP_SUSPECT ${storeName} x${recent.length} in ${STORE_BURST_WINDOW_MS}ms`, stack);
  }
}

export type QueryEventPhase = "fetch_start" | "fetch_success" | "fetch_error" | "cache_updated";

export function trackQueryEvent(
  phase: QueryEventPhase,
  queryKey: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  const keyStr = JSON.stringify(queryKey);
  logBoot("QUERY", phase, { queryKey, ...meta }, keyStr.slice(0, 120));

  if (phase === "fetch_start") {
    const now = Date.now();
    const prev = queryFetchStarts.get(keyStr) ?? [];
    const recent = [...prev.filter((t) => now - t < QUERY_LOOP_WINDOW_MS), now];
    queryFetchStarts.set(keyStr, recent);
    if (recent.length >= QUERY_LOOP_COUNT) {
      loopAlerts.push({
        kind: "query",
        component: keyStr.slice(0, 80),
        count: recent.length,
        windowMs: QUERY_LOOP_WINDOW_MS,
        atMs: now,
      });
      console.warn(`[QUERY] LOOP_SUSPECT ${keyStr.slice(0, 80)} fetch_start x${recent.length}`);
    }
  }
}

export function countRender(componentId: string, phase?: string): void {
  if (!isEnabled()) return;
  const now = Date.now();
  renderTotals.set(componentId, (renderTotals.get(componentId) ?? 0) + 1);

  const prev = renderTimestamps.get(componentId) ?? [];
  const recent = [...prev.filter((t) => now - t < 30_000), now];
  renderTimestamps.set(componentId, recent);

  const in5s = recent.filter((t) => now - t < 5_000).length;
  const in30s = recent.length;

  if (in5s > RENDER_LOOP_5S) {
    const existing = loopAlerts.find(
      (a) => a.kind === "render" && a.component === componentId && now - a.atMs < 5_000,
    );
    if (!existing) {
      loopAlerts.push({
        kind: "render",
        component: componentId,
        count: in5s,
        windowMs: 5_000,
        atMs: now,
      });
      console.warn(`[RENDER] LOOP_SUSPECT ${componentId} ${in5s} renders in 5s phase=${phase ?? "?"}`);
    }
  }
  if (in30s > RENDER_LOOP_30S) {
    const existing = loopAlerts.find(
      (a) => a.kind === "render" && a.component === componentId && a.count >= RENDER_LOOP_30S,
    );
    if (!existing) {
      loopAlerts.push({
        kind: "render",
        component: componentId,
        count: in30s,
        windowMs: 30_000,
        atMs: now,
      });
      console.warn(`[RENDER] LOOP_CONFIRMED ${componentId} ${in30s} renders in 30s`);
    }
  }
}

export function exportInvestigationReport(): {
  exportedAt: string;
  enabled: boolean;
  eventCount: number;
  events: BootInvestigationEvent[];
  loopAlerts: LoopAlert[];
  renderTotals: Record<string, number>;
  topRenders: Array<{ component: string; count: number }>;
} {
  const totals = [...renderTotals.entries()]
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    exportedAt: new Date().toISOString(),
    enabled: isEnabled(),
    eventCount: events.length,
    events: [...events],
    loopAlerts: [...loopAlerts],
    renderTotals: Object.fromEntries(renderTotals),
    topRenders: totals,
  };
}

export function resetBootInvestigation(): void {
  events.length = 0;
  loopAlerts.length = 0;
  renderTimestamps.clear();
  redirectTimestamps.clear();
  queryFetchStarts.clear();
  storeUpdateTimestamps.clear();
  renderTotals.clear();
  consoleDedupe.clear();
}

declare global {
  interface Window {
    __cabBootInvestigation?: typeof exportInvestigationReport;
    __cabBootInvestigationReset?: typeof resetBootInvestigation;
    __cabPendingQueries?: (minPendingMs?: number) => unknown[];
  }
}

if (typeof window !== "undefined" && isEnabled()) {
  window.__cabBootInvestigation = exportInvestigationReport;
  window.__cabBootInvestigationReset = resetBootInvestigation;
}

/** Server/edge log (proxy, RSC) — stesso tag format, no ring buffer. */
export function logBootServer(
  tag: BootInvestigationTag,
  component: string,
  meta?: Record<string, unknown>,
  detail?: string,
): void {
  if (!isEnabled()) return;
  const ts = new Date().toISOString();
  const line = `[${tag}] ${ts} ${component}${detail ? ` — ${detail}` : ""}`;
  if (meta && Object.keys(meta).length > 0) {
    console.info(line, JSON.stringify(meta));
  } else {
    console.info(line);
  }
}
