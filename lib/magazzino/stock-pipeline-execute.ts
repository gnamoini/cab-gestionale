"use client";

/**
 * Esecuzione mutation stock v4 — server-first, version chained, 409 refresh+retry.
 */

import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  stockAdjustFetch,
  type StockAdjustRequest,
  type StockAdjustResponse,
} from "@/lib/magazzino/stock-adjust-client";
import { getStockEntity, mergeStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { enqueueStockMutation } from "@/lib/magazzino/stock-client-queue";
import {
  enqueueJournalEntry,
  tryConfirmJournalMutation,
  updateJournalEntry,
} from "@/lib/magazzino/stock-client-store";
import {
  markCompletedStockOperation,
  markPendingStockOperation,
} from "@/lib/magazzino/stock-operation-registry";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { movimentiListQueryKey } from "@/lib/render/query-key-factory";
import type { PendingStockMutation } from "@/lib/magazzino/stock-types";

export type StockAdjustPipelineInput = Omit<StockAdjustRequest, "expectedVersion" | "operationId"> & {
  operationId?: string;
};

export type StockAdjustPipelineOutcome =
  | { ok: true; data: StockAdjustResponse & { operationId: string } }
  | { ok: false; error: string };

const MAX_CONFLICT_RETRIES = 2;

async function invalidateStockSideEffects(qc: QueryClient, ricambioId: string): Promise<void> {
  void qc.invalidateQueries({ queryKey: movimentiListQueryKey({ ricambio_id: ricambioId }) });
  void qc.invalidateQueries({ queryKey: ["movimenti", "ricambio", ricambioId] });
  scheduleReportBroadcastRefresh(qc);
  void qc.invalidateQueries({ queryKey: ["dashboard", "health-score"] });
  void qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" });
}

async function executeStockAdjustJob(
  qc: QueryClient,
  input: StockAdjustPipelineInput,
  operationId: string,
): Promise<StockAdjustPipelineOutcome> {
  const ricambioId = input.ricambioId.trim();
  let expectedVersion = getStockEntity(qc, ricambioId)?.stockVersion ?? 0;
  updateJournalEntry(ricambioId, operationId, {
    status: "processing",
    expectedVersion,
  });

  let lastError = "Aggiornamento stock non riuscito";

  for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
    logStockPipelineEvent({
      source: "api_adjust",
      operationId,
      ricambioId,
      delta: input.delta,
      expectedVersion,
      detail: `attempt:${attempt}`,
    });

    const result = await stockAdjustFetch({
      ...input,
      expectedVersion,
      operationId,
    });

    if (result.ok) {
      const data = result.data;
      mergeStockEntity(
        qc,
        {
          ricambioId: data.ricambioId,
          quantita: data.quantita,
          stockVersion: data.stockVersion,
          lastOperationId: data.operationId,
        },
        "mutation",
        {
          operationId: data.operationId,
          expectedVersion,
          receivedVersion: data.stockVersion,
        },
      );
      tryConfirmJournalMutation(qc, ricambioId, operationId, data);
      markCompletedStockOperation(operationId, ricambioId);
      markRecentLocalGestionaleMutation(["magazzino_ricambi", "movimenti_ricambi"], ricambioId);
      void invalidateStockSideEffects(qc, ricambioId);
      logStockPipelineEvent({
        source: "api_adjust",
        operationId,
        ricambioId,
        responseVersion: data.stockVersion,
        detail: "success",
      });
      return { ok: true, data: { ...data, operationId } };
    }

    if (result.status === 409 && result.conflict?.current) {
      expectedVersion = result.conflict.current.stockVersion;
      mergeStockEntity(
        qc,
        {
          ricambioId,
          quantita: result.conflict.current.quantita,
          stockVersion: result.conflict.current.stockVersion,
          lastOperationId: null,
        },
        "refetch",
      );
      updateJournalEntry(ricambioId, operationId, { expectedVersion });
      lastError = result.error;
      continue;
    }

    updateJournalEntry(ricambioId, operationId, {
      status: "failed",
      completedAt: Date.now(),
    });
    return { ok: false, error: result.error };
  }

  updateJournalEntry(ricambioId, operationId, {
    status: "failed",
    completedAt: Date.now(),
  });
  return { ok: false, error: lastError };
}

export function runStockAdjustPipeline(
  qc: QueryClient,
  input: StockAdjustPipelineInput,
): Promise<StockAdjustPipelineOutcome> {
  const ricambioId = input.ricambioId.trim();
  const operationId = input.operationId ?? crypto.randomUUID();

  const entry: PendingStockMutation = {
    operationId,
    ricambioId,
    delta: input.delta,
    expectedVersion: null,
    status: "queued",
    createdAt: Date.now(),
  };
  enqueueJournalEntry(entry);
  markPendingStockOperation(operationId, ricambioId);

  return enqueueStockMutation(ricambioId, operationId, () =>
    executeStockAdjustJob(qc, input, operationId),
  );
}
