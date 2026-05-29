import { recordFatal } from "@/lib/observability/fatal-aggregator";
import { gestionaleLogger } from "@/lib/observability/logger";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

const windows = new Map<string, { count: number; start: number }>();

function noteWindow(
  key: string,
  windowMs: number,
  threshold: number,
  onThreshold: () => void,
): void {
  const now = Date.now();
  let w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    w = { count: 0, start: now };
    windows.set(key, w);
  }
  w.count += 1;
  if (w.count > threshold) onThreshold();
}

const warned = new Set<string>();

function warnOnce(key: string, msg: string, meta?: Record<string, unknown>): void {
  if (warned.has(key)) return;
  warned.add(key);
  gestionaleLogger.warn(msg, { operation: "system", meta: { ...meta, degradationKey: key } });
}

export function noteInvalidationTruthSpike(reason: string, count: number): void {
  incrementHealthCounter("invalidateTruthSpike");
  if (count <= 3) return;
  noteWindow(`truth-spike:${reason}`, 10_000, 5, () => {
    recordFatal("invalidation.spike", {
      message: `truth invalidate spike: ${reason} (${count})`,
    });
    warnOnce(`truth-spike:${reason}`, "ops.degradation.invalidation_storm", { reason, count });
  });
}

export function noteRealtimeReconnect(attempt: number): void {
  incrementHealthCounter("realtimeReconnect");
  noteWindow("realtime-reconnect", 60_000, 3, () => {
    warnOnce("realtime-reconnect", "ops.degradation.realtime_reconnect", { attempt });
  });
}

export function notePollingFallbackActivation(reason?: string): void {
  incrementHealthCounter("pollingFallback");
  noteWindow("polling-fallback", 5 * 60_000, 2, () => {
    warnOnce("polling-fallback", "ops.degradation.polling_fallback", { reason: reason?.slice(0, 120) });
  });
}

export function noteHydrationMismatch(): void {
  incrementHealthCounter("hydrationMismatch");
}

export function noteStorageDeleteFailure(): void {
  incrementHealthCounter("storageDeleteFailure");
}

export function notePerfSlowBurst(): void {
  incrementHealthCounter("perfSlow");
  noteWindow("perf-slow", 30_000, 8, () => {
    warnOnce("perf-slow", "ops.degradation.query_storm", {});
  });
}

export function noteOperationalInvalidateBurst(): void {
  incrementHealthCounter("invalidateOperationalBurst");
}
