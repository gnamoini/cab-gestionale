"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeterministicStockPipeline } from "@/lib/feature-flags/stock-pipeline";
import {
  getStockQueueState,
  subscribeStockQueueState,
} from "@/lib/magazzino/stock-client-queue";
import {
  getStockJournalVersion,
  getStockDisplayState,
  hydrateJournalFromSession,
  subscribeStockJournal,
} from "@/lib/magazzino/stock-client-store";
import { runStockAdjustPipeline } from "@/lib/magazzino/stock-pipeline-execute";
import { useEmergencyLegacyStockAdjustMutation } from "@/src/hooks/gestionale/use-stock-adjust-mutation-legacy";
import type {
  StockAdjustMutationInput,
  StockAdjustMutationOutcome,
} from "@/src/hooks/gestionale/use-stock-adjust-mutation-types";

export type { StockAdjustMutationInput, StockAdjustMutationOutcome } from "@/src/hooks/gestionale/use-stock-adjust-mutation-types";

export function useStockJournalVersion(): number {
  return useSyncExternalStore(subscribeStockJournal, getStockJournalVersion, () => 0);
}

function useRicambioQueuePending(ricambioId: string): number {
  return useSyncExternalStore(
    (cb) => subscribeStockQueueState(ricambioId, cb),
    () => getStockQueueState(ricambioId).pending,
    () => 0,
  );
}

function useDeterministicStockAdjustMutation() {
  const qc = useQueryClient();

  useEffect(() => {
    hydrateJournalFromSession();
  }, []);

  const adjustDelta = useCallback(
    (input: StockAdjustMutationInput): Promise<StockAdjustMutationOutcome> => {
      return runStockAdjustPipeline(qc, input);
    },
    [qc],
  );

  return {
    adjustDelta,
    isAdjusting: false,
    isPipelineV4: true as const,
  };
}

export function useStockAdjustMutation() {
  const v4 = useDeterministicStockPipeline();
  const deterministic = useDeterministicStockAdjustMutation();
  const legacy = useEmergencyLegacyStockAdjustMutation();
  return v4 ? deterministic : legacy;
}

/** Display quantita certified + pending journal per riga. */
export function useStockDisplayState(ricambioId: string) {
  const qc = useQueryClient();
  useStockJournalVersion();
  useRicambioQueuePending(ricambioId);
  return getStockDisplayState(qc, ricambioId);
}

/** True se coda o journal attivi per ricambio. */
export function useStockRicambioPending(ricambioId: string): boolean {
  const display = useStockDisplayState(ricambioId);
  const queuePending = useRicambioQueuePending(ricambioId);
  return display.isPending || queuePending > 0;
}
