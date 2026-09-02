/**
 * Registry operazioni stock — pending (breve) + recent completed (dedupe realtime).
 */

import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";

const PENDING_TTL_MS = 30_000;
const RECENT_TTL_MS = 5 * 60_000;

type PendingEntry = { ricambioId: string; expiresAt: number };
type RecentEntry = { ricambioId: string; completedAt: number };

const pending = new Map<string, PendingEntry>();
const recentCompleted = new Map<string, RecentEntry>();

function prune(now: number): void {
  for (const [id, e] of pending) {
    if (e.expiresAt <= now) pending.delete(id);
  }
  for (const [id, e] of recentCompleted) {
    if (now - e.completedAt > RECENT_TTL_MS) recentCompleted.delete(id);
  }
}

export function markPendingStockOperation(operationId: string, ricambioId: string): void {
  const id = operationId.trim();
  if (!id) return;
  const now = Date.now();
  prune(now);
  pending.set(id, { ricambioId: ricambioId.trim(), expiresAt: now + PENDING_TTL_MS });
}

export function markCompletedStockOperation(operationId: string, ricambioId: string): void {
  const id = operationId.trim();
  if (!id) return;
  const now = Date.now();
  prune(now);
  pending.delete(id);
  recentCompleted.set(id, { ricambioId: ricambioId.trim(), completedAt: now });
}

export function isKnownStockOperation(operationId: string | null | undefined): boolean {
  const id = operationId?.trim();
  if (!id) return false;
  const now = Date.now();
  prune(now);
  if (pending.has(id)) return true;
  const recent = recentCompleted.get(id);
  return recent != null && now - recent.completedAt <= RECENT_TTL_MS;
}

export function shouldSuppressStockRealtimeInvalidate(
  operationId: string | null | undefined,
): boolean {
  if (!operationId?.trim()) {
    logStockPipelineEvent({
      source: "realtime",
      detail: "Realtime stock event without operation_id — no suppression",
    });
    if (typeof console !== "undefined") {
      console.warn("[stock-realtime-gate] Realtime stock event without operation_id");
    }
    return false;
  }
  return isKnownStockOperation(operationId);
}

/** Mutation fallita — non sopprimere realtime remoti successivi con lo stesso operation_id. */
export function abortPendingStockOperation(operationId: string): void {
  const id = operationId?.trim();
  if (!id) return;
  pending.delete(id);
}

export function clearStockOperationRegistryForTest(): void {
  pending.clear();
  recentCompleted.clear();
}
