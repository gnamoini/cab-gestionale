"use client";

import { incrementHealthCounter, getRuntimeHealthSnapshot } from "@/lib/observability/runtime-health";
import { trackRuntimeEvent, RuntimeEvents } from "@/lib/observability/events";
import type { StockMergeDecision, StockMergeSource } from "@/lib/magazzino/stock-merge-gate";

export type StockMergeTelemetryPayload = {
  operationId?: string | null;
  ricambioId?: string;
  expectedVersion?: number;
  receivedVersion?: number;
  cacheVersion?: number;
  realtimeVersion?: number;
  queryVersion?: number;
  mergeSource: StockMergeSource;
  decision?: StockMergeDecision;
};

const recentEvents: StockMergeTelemetryPayload[] = [];
const MAX_RECENT = 50;

function pushRecent(payload: StockMergeTelemetryPayload): void {
  recentEvents.push(payload);
  if (recentEvents.length > MAX_RECENT) recentEvents.shift();
}

/** Telemetria merge stock — Fase 0.5 baseline pre/post refactor. */
export function recordStockMergeTelemetry(payload: StockMergeTelemetryPayload): void {
  pushRecent(payload);

  const counterKey =
    payload.decision === "ignore"
      ? "stock_merge_ignore"
      : payload.decision === "warn_conflict"
        ? "stock_merge_warn_conflict"
        : "stock_merge_applied";

  incrementHealthCounter(counterKey, 1);
  incrementHealthCounter(`stock_merge_source_${payload.mergeSource}`, 1);

  if (payload.mergeSource === "rejected") {
    incrementHealthCounter("stock_rollback_count", 1);
  }

  trackRuntimeEvent(RuntimeEvents.stockMerge, {
    ...payload,
    operationId: payload.operationId ?? undefined,
  });
}

export function recordStockInvalidateTelemetry(context: "adjust" | "other" = "other"): void {
  incrementHealthCounter("stock_invalidate_count", 1);
  if (context === "adjust") {
    incrementHealthCounter("stock_invalidate_adjust_count", 1);
  }
}

export function getRecentStockMergeTelemetry(): readonly StockMergeTelemetryPayload[] {
  return recentEvents;
}

export function getStockTelemetryCounters(): Record<string, number> {
  const { counters } = getRuntimeHealthSnapshot();
  return {
    rollback_count: counters.stock_rollback_count ?? 0,
    invalidate_count: counters.stock_invalidate_count ?? 0,
    invalidate_adjust_count: counters.stock_invalidate_adjust_count ?? 0,
    merge_applied: counters.stock_merge_applied ?? 0,
    merge_ignore: counters.stock_merge_ignore ?? 0,
    merge_warn_conflict: counters.stock_merge_warn_conflict ?? 0,
  };
}

/** Per test. */
export function clearStockMergeTelemetryForTest(): void {
  recentEvents.length = 0;
}
