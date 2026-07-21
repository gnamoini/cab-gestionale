/** Tipi condivisi stock pipeline v4. */

export type PendingStockMutationStatus = "queued" | "processing" | "confirmed" | "failed";

export type PendingStockMutation = {
  operationId: string;
  ricambioId: string;
  delta: number;
  expectedVersion: number | null;
  status: PendingStockMutationStatus;
  createdAt: number;
  completedAt?: number;
  responseVersion?: number;
};

export type StockDisplayState = {
  certifiedQuantita: number;
  certifiedVersion: number;
  pendingDelta: number;
  displayQuantita: number;
  pendingCount: number;
  isPending: boolean;
};

export type QueueState = {
  running: boolean;
  pending: number;
  lastOperationId?: string;
};

export const STOCK_JOURNAL_STORAGE_KEY = "cab-stock-journal-v1" as const;

/** Job in coda oltre questa soglia → failed + reconcile. */
export const STOCK_JOURNAL_PROCESSING_TTL_MS = 120_000;
