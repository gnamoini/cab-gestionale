"use client";

/**
 * Store locale per-riga: debounce + display ottimistico scorta.
 * Il journal v4 entra solo al commit (delta netto).
 */

import type { QueryClient } from "@tanstack/react-query";
import { resolveScortaAdjustTarget } from "@/lib/magazzino/resolve-scorta-adjust-target";
import { getStockEntity } from "@/lib/magazzino/stock-entity-cache";
import type {
  StockAdjustMutationInput,
  StockAdjustMutationOutcome,
} from "@/src/hooks/gestionale/use-stock-adjust-mutation-types";

export const DEBOUNCED_SCORTA_MS = 500;
export const DEBOUNCED_SCORTA_SUCCESS_MS = 1000;

export type DebouncedScortaCallbacks = {
  onPersistLog: (logId: string, prima: number, dopo: number) => void;
  onRemoveLog: (logId: string) => void;
  onCommitSuccess?: () => void;
  onCommitError: (error: string) => void;
};

export type DebouncedScortaCommitDeps = {
  qc: QueryClient;
  adjustDelta: (input: StockAdjustMutationInput) => Promise<StockAdjustMutationOutcome>;
};

type DebouncedScortaRow = {
  serverQuantity: number;
  displayQuantity: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  successTimer: ReturnType<typeof setTimeout> | null;
  isCommitting: boolean;
  commitVersion: number;
  showSuccessUntil: number;
  pendingAfterCommit: boolean;
  subscriberCount: number;
  logId: string | null;
  ricambioLabel: string;
  contaStatistiche: boolean;
  debounceMs: number;
  enabled: boolean;
  callbacks: DebouncedScortaCallbacks | null;
  commitDeps: DebouncedScortaCommitDeps | null;
};

export type DebouncedScortaSnapshot = {
  displayQuantity: number;
  serverQuantity: number;
  isDirty: boolean;
  isCommitting: boolean;
  showSuccess: boolean;
};

const rows = new Map<string, DebouncedScortaRow>();
const listeners = new Map<string, Set<() => void>>();
/** ponytail: cache per useSyncExternalStore — stesso ref finché i valori non cambiano. */
const snapshotCache = new Map<string, DebouncedScortaSnapshot>();
let storeVersion = 0;
let logSeq = 0;
let onlineListenerAttached = false;

function notify(ricambioId: string): void {
  storeVersion += 1;
  const set = listeners.get(ricambioId.trim());
  if (!set) return;
  for (const fn of set) fn();
}

export function getDebouncedScortaStoreVersion(): number {
  return storeVersion;
}

export function subscribeDebouncedScorta(ricambioId: string, cb: () => void): () => void {
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

function isRowDirty(row: DebouncedScortaRow): boolean {
  return row.displayQuantity !== row.serverQuantity;
}

function snapshotFor(id: string, row: DebouncedScortaRow): DebouncedScortaSnapshot {
  const isDirty = isRowDirty(row);
  const showSuccess = Date.now() < row.showSuccessUntil;
  const cached = snapshotCache.get(id);
  if (
    cached &&
    cached.displayQuantity === row.displayQuantity &&
    cached.serverQuantity === row.serverQuantity &&
    cached.isDirty === isDirty &&
    cached.isCommitting === row.isCommitting &&
    cached.showSuccess === showSuccess
  ) {
    return cached;
  }
  const snap: DebouncedScortaSnapshot = {
    displayQuantity: row.displayQuantity,
    serverQuantity: row.serverQuantity,
    isDirty,
    isCommitting: row.isCommitting,
    showSuccess,
  };
  snapshotCache.set(id, snap);
  return snap;
}

export function getDebouncedScortaSnapshot(ricambioId: string): DebouncedScortaSnapshot | null {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row) return null;
  return snapshotFor(id, row);
}

function clearDebounceTimer(row: DebouncedScortaRow): void {
  if (row.debounceTimer) {
    clearTimeout(row.debounceTimer);
    row.debounceTimer = null;
  }
}

function scheduleSuccessClear(ricambioId: string, row: DebouncedScortaRow): void {
  if (row.successTimer) clearTimeout(row.successTimer);
  row.successTimer = setTimeout(() => {
    row.successTimer = null;
    row.showSuccessUntil = 0;
    notify(ricambioId);
  }, DEBOUNCED_SCORTA_SUCCESS_MS);
}

function ensureRow(
  ricambioId: string,
  serverQuantity: number,
  opts: {
    ricambioLabel: string;
    contaStatistiche: boolean;
    debounceMs: number;
    enabled: boolean;
  },
): DebouncedScortaRow {
  const id = ricambioId.trim();
  let row = rows.get(id);
  if (!row) {
    const q = Math.max(0, Math.round(serverQuantity));
    row = {
      serverQuantity: q,
      displayQuantity: q,
      debounceTimer: null,
      successTimer: null,
      isCommitting: false,
      commitVersion: 0,
      showSuccessUntil: 0,
      pendingAfterCommit: false,
      subscriberCount: 0,
      logId: null,
      ricambioLabel: opts.ricambioLabel,
      contaStatistiche: opts.contaStatistiche,
      debounceMs: opts.debounceMs,
      enabled: opts.enabled,
      callbacks: null,
      commitDeps: null,
    };
    rows.set(id, row);
    return row;
  }
  row.ricambioLabel = opts.ricambioLabel;
  row.contaStatistiche = opts.contaStatistiche;
  row.debounceMs = opts.debounceMs;
  row.enabled = opts.enabled;
  return row;
}

export function acquireDebouncedScortaSubscriber(
  ricambioId: string,
  serverQuantity: number,
  opts: {
    ricambioLabel: string;
    contaStatistiche: boolean;
    debounceMs?: number;
    enabled?: boolean;
    callbacks: DebouncedScortaCallbacks;
    commitDeps: DebouncedScortaCommitDeps;
  },
): void {
  const row = ensureRow(ricambioId, serverQuantity, {
    ricambioLabel: opts.ricambioLabel,
    contaStatistiche: opts.contaStatistiche,
    debounceMs: opts.debounceMs ?? DEBOUNCED_SCORTA_MS,
    enabled: opts.enabled ?? true,
  });
  row.subscriberCount += 1;
  row.callbacks = opts.callbacks;
  row.commitDeps = opts.commitDeps;
  attachOnlineListener();
  notify(ricambioId);
}

export function releaseDebouncedScortaSubscriber(ricambioId: string): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row) return;
  row.subscriberCount = Math.max(0, row.subscriberCount - 1);
  if (row.subscriberCount === 0) {
    void flushDebouncedScorta(id);
  }
}

export function updateDebouncedScortaBindings(
  ricambioId: string,
  patch: Partial<{
    ricambioLabel: string;
    contaStatistiche: boolean;
    debounceMs: number;
    enabled: boolean;
    callbacks: DebouncedScortaCallbacks;
    commitDeps: DebouncedScortaCommitDeps;
  }>,
): void {
  const row = rows.get(ricambioId.trim());
  if (!row) return;
  if (patch.ricambioLabel !== undefined) row.ricambioLabel = patch.ricambioLabel;
  if (patch.contaStatistiche !== undefined) row.contaStatistiche = patch.contaStatistiche;
  if (patch.debounceMs !== undefined) row.debounceMs = patch.debounceMs;
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.callbacks !== undefined) row.callbacks = patch.callbacks;
  if (patch.commitDeps !== undefined) row.commitDeps = patch.commitDeps;
}

/** Allinea serverQuantity; non tocca display se dirty o in commit. */
export function syncDebouncedScortaServerQuantity(ricambioId: string, serverQuantity: number): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  const q = Math.max(0, Math.round(serverQuantity));
  if (!row) return;
  const wasDirty = isRowDirty(row);
  row.serverQuantity = q;
  if (!wasDirty && !row.isCommitting) {
    row.displayQuantity = q;
  }
  notify(id);
}

function scheduleCommit(ricambioId: string): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row || !row.enabled) return;
  clearDebounceTimer(row);
  row.debounceTimer = setTimeout(() => {
    row.debounceTimer = null;
    void commitDebouncedScortaNow(id);
  }, row.debounceMs);
}

function causaleForDelta(contaStatistiche: boolean, delta: number): string {
  if (contaStatistiche) return delta > 0 ? "carico_manuale" : "scarico_manuale";
  return "rettifica_inventario";
}

async function executeCommit(ricambioId: string): Promise<void> {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row || !row.enabled || !row.commitDeps || !row.callbacks) return;

  if (row.isCommitting) {
    row.pendingAfterCommit = true;
    return;
  }

  const { qc, adjustDelta } = row.commitDeps;
  const prima = getStockEntity(qc, id)?.quantita ?? row.serverQuantity;
  const dopo = row.displayQuantity;
  const appliedDelta = dopo - prima;
  if (appliedDelta === 0) {
    row.serverQuantity = prima;
    row.pendingAfterCommit = false;
    notify(id);
    return;
  }

  if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
    notify(id);
    return;
  }

  row.isCommitting = true;
  row.pendingAfterCommit = false;
  const version = ++row.commitVersion;

  const logId = `log-${Date.now()}-${++logSeq}`;
  row.logId = logId;
  row.callbacks.onPersistLog(logId, prima, dopo);
  notify(id);

  const stats = row.contaStatistiche;
  const outcome = await adjustDelta({
    ricambioId: id,
    delta: appliedDelta,
    contaStatistiche: stats,
    origine: stats ? "manual_adjustment" : "inventario",
    causale: causaleForDelta(stats, appliedDelta),
  });

  if (version !== row.commitVersion) return;

  if (outcome.ok) {
    const certified = outcome.data.quantita;
    row.serverQuantity = certified;
    row.isCommitting = false;
    row.logId = null;
    row.showSuccessUntil = Date.now() + DEBOUNCED_SCORTA_SUCCESS_MS;
    scheduleSuccessClear(id, row);
    row.callbacks.onCommitSuccess?.();
    notify(id);

    const stillDirty = row.displayQuantity !== certified;
    if (row.pendingAfterCommit || stillDirty) {
      row.pendingAfterCommit = false;
      void executeCommit(id);
    }
    return;
  }

  if (row.logId) {
    row.callbacks.onRemoveLog(row.logId);
    row.logId = null;
  }
  row.isCommitting = false;
  row.callbacks.onCommitError(outcome.error);
  notify(id);
}

export async function commitDebouncedScortaNow(ricambioId: string): Promise<void> {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row) return;
  clearDebounceTimer(row);
  await executeCommit(id);
}

export async function flushDebouncedScorta(ricambioId: string): Promise<void> {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row) return;
  clearDebounceTimer(row);
  if (isRowDirty(row) || row.pendingAfterCommit) {
    await executeCommit(id);
  }
}

function bumpDisplay(ricambioId: string, delta: number): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row || !row.enabled) return;

  const target = resolveScortaAdjustTarget(row.displayQuantity, delta);
  if (!target) return;

  row.displayQuantity = target.dopo;
  if (row.isCommitting) {
    row.pendingAfterCommit = true;
  } else {
    scheduleCommit(id);
  }
  notify(id);
}

export function incrementDebouncedScorta(ricambioId: string): void {
  bumpDisplay(ricambioId, 1);
}

export function decrementDebouncedScorta(ricambioId: string): void {
  bumpDisplay(ricambioId, -1);
}

export function setDebouncedScortaQuantity(ricambioId: string, target: number): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row || !row.enabled) return;

  const targetQ = Math.max(0, Math.round(target));
  if (targetQ === row.displayQuantity) return;

  row.displayQuantity = targetQ;
  if (row.isCommitting) {
    row.pendingAfterCommit = true;
  } else {
    scheduleCommit(id);
  }
  notify(id);
}

export function initDebouncedScortaRow(
  ricambioId: string,
  serverQuantity: number,
  opts: {
    ricambioLabel: string;
    contaStatistiche: boolean;
    debounceMs?: number;
    enabled?: boolean;
  },
): DebouncedScortaSnapshot {
  const id = ricambioId.trim();
  const row = ensureRow(ricambioId, serverQuantity, {
    ricambioLabel: opts.ricambioLabel,
    contaStatistiche: opts.contaStatistiche,
    debounceMs: opts.debounceMs ?? DEBOUNCED_SCORTA_MS,
    enabled: opts.enabled ?? true,
  });
  return snapshotFor(id, row);
}

function flushAllDirtyOnline(): void {
  for (const [id, row] of rows) {
    if (row.subscriberCount > 0 && (isRowDirty(row) || row.pendingAfterCommit) && !row.isCommitting) {
      clearDebounceTimer(row);
      void executeCommit(id);
    }
  }
}

function attachOnlineListener(): void {
  if (onlineListenerAttached || typeof window === "undefined") return;
  onlineListenerAttached = true;
  window.addEventListener("online", flushAllDirtyOnline);
}

export function clearDebouncedScortaStoreForTest(): void {
  for (const row of rows.values()) {
    if (row.debounceTimer) clearTimeout(row.debounceTimer);
    if (row.successTimer) clearTimeout(row.successTimer);
  }
  rows.clear();
  listeners.clear();
  snapshotCache.clear();
  storeVersion = 0;
  logSeq = 0;
}

/** Test-only: imposta serverQuantity e opzionalmente display. */
export function __testSetDebouncedScortaRow(
  ricambioId: string,
  patch: Partial<DebouncedScortaRow>,
): void {
  const id = ricambioId.trim();
  const row = rows.get(id);
  if (!row) return;
  Object.assign(row, patch);
  notify(id);
}

/** Test-only: leggi riga interna. */
export function __testGetDebouncedScortaRow(ricambioId: string): DebouncedScortaRow | undefined {
  return rows.get(ricambioId.trim());
}

/** Test-only: esegui commit senza debounce timer. */
export { executeCommit as __testExecuteCommit };
