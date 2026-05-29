import { gestionaleLogger } from "@/lib/observability/logger";

export type FatalKind =
  | "runtime.error"
  | "boundary.crash"
  | "hydration.mismatch"
  | "invalidation.spike";

export type FatalRecord = {
  kind: FatalKind;
  message: string;
  route?: string;
  at: number;
  count: number;
};

const MAX_ENTRIES = 50;
const THROTTLE_MS = 10_000;

const buffer: FatalRecord[] = [];
const lastByKey = new Map<string, number>();

function keyFor(kind: FatalKind, message: string, route?: string): string {
  return `${kind}|${route ?? ""}|${message.slice(0, 120)}`;
}

/** Registra evento fatale in-memory (dedupe + throttle). */
export function recordFatal(
  kind: FatalKind,
  payload: { message: string; route?: string },
): void {
  const k = keyFor(kind, payload.message, payload.route);
  const now = Date.now();
  const last = lastByKey.get(k);
  if (last != null && now - last < THROTTLE_MS) {
    const existing = buffer.find(
      (e) => e.kind === kind && e.message === payload.message && e.route === payload.route,
    );
    if (existing) existing.count += 1;
    return;
  }
  lastByKey.set(k, now);

  const rec: FatalRecord = {
    kind,
    message: payload.message,
    route: payload.route,
    at: now,
    count: 1,
  };
  buffer.push(rec);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  gestionaleLogger.error("fatal.aggregated", {
    event: kind,
    route: payload.route,
    meta: { message: payload.message },
  });
}

export function getRecentFatals(limit = 20): readonly FatalRecord[] {
  return buffer.slice(-limit);
}

/** Riepilogo throttled per log singolo (es. boundary). */
export function flushSummaryForLog(): void {
  if (buffer.length === 0) return;
  const recent = buffer.slice(-5);
  gestionaleLogger.warn("fatal.summary", {
    meta: {
      total: buffer.length,
      recent: recent.map((r) => ({ kind: r.kind, route: r.route, count: r.count })),
    },
  });
}
