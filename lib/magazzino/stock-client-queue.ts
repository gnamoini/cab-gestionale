/**
 * Coda singleton per ricambio — serializza mutation stock fuori dal ciclo React.
 */

import type { QueueState } from "@/lib/magazzino/stock-types";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";

const chains = new Map<string, Promise<unknown>>();
const queueStates = new Map<string, QueueState>();
const listeners = new Map<string, Set<() => void>>();

function defaultState(): QueueState {
  return { running: false, pending: 0 };
}

function getOrCreateState(ricambioId: string): QueueState {
  const id = ricambioId.trim();
  let s = queueStates.get(id);
  if (!s) {
    s = defaultState();
    queueStates.set(id, s);
  }
  return s;
}

function notify(ricambioId: string): void {
  const set = listeners.get(ricambioId.trim());
  if (!set) return;
  for (const fn of set) fn();
}

function patchState(ricambioId: string, patch: Partial<QueueState>): void {
  const id = ricambioId.trim();
  const prev = getOrCreateState(id);
  queueStates.set(id, { ...prev, ...patch });
  notify(id);
}

export function getStockQueueState(ricambioId: string): QueueState {
  return { ...getOrCreateState(ricambioId) };
}

export function subscribeStockQueueState(ricambioId: string, cb: () => void): () => void {
  const id = ricambioId.trim();
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(id);
  };
}

export function enqueueStockMutation<T>(
  ricambioId: string,
  operationId: string,
  job: () => Promise<T>,
): Promise<T> {
  const id = ricambioId.trim();
  const state = getOrCreateState(id);
  patchState(id, {
    pending: state.pending + 1,
    lastOperationId: operationId,
  });

  const prev = chains.get(id) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(async () => {
      patchState(id, { running: true });
      logStockPipelineEvent({
        source: "queue",
        ricambioId: id,
        operationId,
        detail: "job_start",
      });
      try {
        return await job();
      } finally {
        const s = getOrCreateState(id);
        const pendingLeft = Math.max(0, s.pending - 1);
        patchState(id, {
          running: pendingLeft > 0,
          pending: pendingLeft,
        });
        logStockPipelineEvent({
          source: "queue",
          ricambioId: id,
          operationId,
          detail: "job_end",
        });
      }
    });

  chains.set(
    id,
    next.finally(() => {
      if (chains.get(id) === next) chains.delete(id);
    }),
  );

  return next as Promise<T>;
}

export function clearStockClientQueueForTest(): void {
  chains.clear();
  queueStates.clear();
  listeners.clear();
}
