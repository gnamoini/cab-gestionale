"use client";

/* eslint-disable react-hooks/refs -- lint phase2: intentional ref wiring for stable callbacks/DOM sync */

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  acquireDebouncedScortaSubscriber,
  decrementDebouncedScorta,
  getDebouncedScortaSnapshot,
  getDebouncedScortaStoreVersion,
  incrementDebouncedScorta,
  releaseDebouncedScortaSubscriber,
  setDebouncedScortaQuantity,
  subscribeDebouncedScorta,
  syncDebouncedScortaServerQuantity,
  updateDebouncedScortaBindings,
  type DebouncedScortaCallbacks,
  type DebouncedScortaCommitDeps,
  type DebouncedScortaSnapshot,
} from "@/lib/magazzino/debounced-scorta-store";
import { getStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { useStockAdjustMutation, useStockJournalVersion } from "@/src/hooks/gestionale/use-stock-adjust-mutation";

export type UseDebouncedInventoryQuantityOptions = {
  ricambioId: string;
  ricambioLabel: string;
  /** Scorta dalla riga lista quando entity cache non ancora popolata. */
  fallbackScorta?: number;
  contaStatistiche: boolean;
  enabled?: boolean;
  debounceMs?: number;
  onPersistLog: (logId: string, prima: number, dopo: number) => void;
  onRemoveLog: (logId: string) => void;
  onCommitSuccess?: () => void;
  onCommitError: (error: string) => void;
};

export type UseDebouncedInventoryQuantityResult = {
  displayQuantity: number;
  isDirty: boolean;
  isCommitting: boolean;
  showSuccess: boolean;
  increment: () => void;
  decrement: () => void;
  setQuantity: (target: number) => void;
};

function resolveServerQuantity(
  qc: ReturnType<typeof useQueryClient>,
  ricambioId: string,
  fallbackScorta: number,
): number {
  const entity = getStockEntity(qc, ricambioId);
  if (entity) return entity.quantita;
  return Math.max(0, Math.round(fallbackScorta));
}

export function useDebouncedInventoryQuantity(
  opts: UseDebouncedInventoryQuantityOptions,
): UseDebouncedInventoryQuantityResult {
  const qc = useQueryClient();
  const { adjustDelta } = useStockAdjustMutation();
  useStockJournalVersion();

  const {
    ricambioId,
    ricambioLabel,
    fallbackScorta = 0,
    contaStatistiche,
    enabled = true,
    debounceMs,
    onPersistLog,
    onRemoveLog,
    onCommitSuccess,
    onCommitError,
  } = opts;

  const id = ricambioId.trim();
  const serverQuantity = resolveServerQuantity(qc, id, fallbackScorta);

  const callbacksRef = useRef<DebouncedScortaCallbacks>({
    onPersistLog,
    onRemoveLog,
    onCommitSuccess,
    onCommitError,
  });
  callbacksRef.current = { onPersistLog, onRemoveLog, onCommitSuccess, onCommitError };

  const commitDeps = useMemo<DebouncedScortaCommitDeps>(
    () => ({ qc, adjustDelta }),
    [qc, adjustDelta],
  );

  const fallbackSnapshotRef = useRef<DebouncedScortaSnapshot | null>(null);

  const subscribe = useCallback(
    (cb: () => void) => subscribeDebouncedScorta(id, cb),
    [id],
  );

  const getSnapshot = useCallback(() => {
    void getDebouncedScortaStoreVersion();
    const snap = getDebouncedScortaSnapshot(id);
    if (snap) return snap;
    const q = serverQuantity;
    const cached = fallbackSnapshotRef.current;
    if (
      cached &&
      cached.displayQuantity === q &&
      cached.serverQuantity === q &&
      !cached.isDirty &&
      !cached.isCommitting &&
      !cached.showSuccess
    ) {
      return cached;
    }
    const next: DebouncedScortaSnapshot = {
      displayQuantity: q,
      serverQuantity: q,
      isDirty: false,
      isCommitting: false,
      showSuccess: false,
    };
    fallbackSnapshotRef.current = next;
    return next;
  }, [id, serverQuantity]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    acquireDebouncedScortaSubscriber(id, serverQuantity, {
      ricambioLabel,
      contaStatistiche,
      debounceMs,
      enabled,
      callbacks: {
        onPersistLog: (...args) => callbacksRef.current.onPersistLog(...args),
        onRemoveLog: (...args) => callbacksRef.current.onRemoveLog(...args),
        onCommitSuccess: () => callbacksRef.current.onCommitSuccess?.(),
        onCommitError: (err) => callbacksRef.current.onCommitError(err),
      },
      commitDeps,
    });
    return () => releaseDebouncedScortaSubscriber(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- acquire once per id; bindings via update effect
  }, [id]);

  useEffect(() => {
    updateDebouncedScortaBindings(id, {
      ricambioLabel,
      contaStatistiche,
      debounceMs,
      enabled,
      callbacks: {
        onPersistLog: (...args) => callbacksRef.current.onPersistLog(...args),
        onRemoveLog: (...args) => callbacksRef.current.onRemoveLog(...args),
        onCommitSuccess: () => callbacksRef.current.onCommitSuccess?.(),
        onCommitError: (err) => callbacksRef.current.onCommitError(err),
      },
      commitDeps,
    });
  }, [id, ricambioLabel, contaStatistiche, debounceMs, enabled, commitDeps]);

  useEffect(() => {
    syncDebouncedScortaServerQuantity(id, serverQuantity);
  }, [id, serverQuantity]);

  const increment = useCallback(() => incrementDebouncedScorta(id), [id]);
  const decrement = useCallback(() => decrementDebouncedScorta(id), [id]);
  const setQuantity = useCallback((target: number) => setDebouncedScortaQuantity(id, target), [id]);

  return {
    displayQuantity: state.displayQuantity,
    isDirty: state.isDirty,
    isCommitting: state.isCommitting,
    showSuccess: state.showSuccess,
    increment,
    decrement,
    setQuantity,
  };
}
