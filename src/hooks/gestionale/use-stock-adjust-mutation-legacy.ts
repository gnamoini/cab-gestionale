"use client";

/**
 * Percorso legacy emergenza — frozen, kill switch only.
 * @deprecated Usare stock-pipeline-execute quando v4 attivo.
 */

import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { stockAdjustFetch, type StockAdjustRequest, type StockAdjustResponse } from "@/lib/magazzino/stock-adjust-client";
import {
  getStockEntity,
  mergeStockEntity,
  type StockEntity,
} from "@/lib/magazzino/stock-entity-cache";
import { applyOptimisticStockAdjust } from "@/lib/magazzino/apply-optimistic-stock-adjust";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { movimentiListQueryKey } from "@/lib/render/query-key-factory";
import type {
  StockAdjustMutationInput,
  StockAdjustMutationContext,
  StockAdjustMutationOutcome,
} from "@/src/hooks/gestionale/use-stock-adjust-mutation-types";

const MAX_CONFLICT_RETRIES = 2;

async function invalidateStockSideEffects(
  qc: ReturnType<typeof useQueryClient>,
  ricambioId: string,
): Promise<void> {
  void qc.invalidateQueries({ queryKey: movimentiListQueryKey({ ricambio_id: ricambioId }) });
  void qc.invalidateQueries({ queryKey: ["movimenti", "ricambio", ricambioId] });
  scheduleReportBroadcastRefresh(qc);
  void qc.invalidateQueries({ queryKey: ["dashboard", "health-score"] });
}

export function useEmergencyLegacyStockAdjustMutation() {
  const qc = useQueryClient();
  const burstQueues = useRef(new Map<string, Promise<unknown>>());
  const pendingCtxRef = useRef(new Map<string, StockAdjustMutationContext[]>());

  const mutation = useMutation({
    mutationFn: async (input: StockAdjustMutationInput): Promise<StockAdjustMutationOutcome> => {
      const operationId = input.operationId ?? crypto.randomUUID();
      let expectedVersion = getStockEntity(qc, input.ricambioId)?.stockVersion ?? 0;
      let lastError = "Aggiornamento stock non riuscito";

      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        const result = await stockAdjustFetch({
          ...input,
          expectedVersion,
          operationId,
        });

        if (result.ok) return { ok: true, data: { ...result.data, operationId } };

        if (result.status === 409 && result.conflict?.current) {
          expectedVersion = result.conflict.current.stockVersion;
          mergeStockEntity(
            qc,
            {
              ricambioId: input.ricambioId,
              quantita: result.conflict.current.quantita,
              stockVersion: result.conflict.current.stockVersion,
              lastOperationId: null,
            },
            "refetch",
          );
          lastError = result.error;
          continue;
        }

        return { ok: false, error: result.error };
      }

      return { ok: false, error: lastError };
    },
    onMutate: async (input): Promise<StockAdjustMutationContext> => {
      void qc.cancelQueries({ queryKey: QK.magazzino });
      const stack = pendingCtxRef.current.get(input.ricambioId);
      const ctx = stack?.shift();
      if (ctx) return ctx;

      const operationId = input.operationId ?? crypto.randomUUID();
      const previous = applyOptimisticStockAdjust(qc, { ...input, operationId });
      return { previous, operationId };
    },
    onSuccess: (outcome, _input, ctx) => {
      if (!outcome.ok) {
        if (ctx?.previous) {
          mergeStockEntity(qc, ctx.previous, "rejected", { operationId: ctx.operationId });
        }
        return;
      }
      const data = outcome.data;
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
          receivedVersion: data.stockVersion,
        },
      );
      markRecentLocalGestionaleMutation(["magazzino_ricambi", "movimenti_ricambi"], data.ricambioId);
      void qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" });
      void invalidateStockSideEffects(qc, data.ricambioId);
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        mergeStockEntity(qc, ctx.previous, "rejected", { operationId: ctx.operationId });
      }
    },
  });

  const adjustDelta = useCallback(
    (input: StockAdjustMutationInput): Promise<StockAdjustMutationOutcome> => {
      const ricambioId = input.ricambioId;
      const operationId = input.operationId ?? crypto.randomUUID();
      const previous = applyOptimisticStockAdjust(qc, { ...input, operationId });
      const stack = pendingCtxRef.current.get(ricambioId) ?? [];
      stack.push({ previous, operationId });
      pendingCtxRef.current.set(ricambioId, stack);

      const prev = burstQueues.current.get(ricambioId) ?? Promise.resolve();
      const next: Promise<StockAdjustMutationOutcome> = prev
        .catch(() => ({ ok: false as const, error: "Aggiornamento stock non riuscito" }))
        .then(() => mutation.mutateAsync({ ...input, operationId }));
      burstQueues.current.set(
        ricambioId,
        next.finally(() => {
          if (burstQueues.current.get(ricambioId) === next) {
            burstQueues.current.delete(ricambioId);
          }
        }),
      );
      return next;
    },
    [mutation, qc],
  );

  return {
    ...mutation,
    adjustDelta,
    isAdjusting: mutation.isPending,
    isPipelineV4: false as const,
  };
}
