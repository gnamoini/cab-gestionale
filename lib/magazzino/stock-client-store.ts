"use client";

/**
 * Client store stock v4 — journal + sessionStorage + display state.
 * Non modifica mai certified quantita/version (solo stock-entity-cache).
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  STOCK_JOURNAL_PROCESSING_TTL_MS,
  STOCK_JOURNAL_STORAGE_KEY,
  type PendingStockMutation,
  type StockDisplayState,
} from "@/lib/magazzino/stock-types";
import { getStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";
import type { StockAdjustResponse } from "@/lib/magazzino/stock-adjust-client";

const journalByRicambio = new Map<string, PendingStockMutation[]>();
const journalListeners = new Set<() => void>();
let journalVersion = 0;

function notifyJournal(): void {
  journalVersion += 1;
  for (const fn of journalListeners) fn();
  persistJournalToSession();
}

export function getStockJournalVersion(): number {
  return journalVersion;
}

function activeMutations(list: PendingStockMutation[]): PendingStockMutation[] {
  return list.filter((m) => m.status === "queued" || m.status === "processing");
}

function pendingDeltaFor(list: PendingStockMutation[]): number {
  return activeMutations(list).reduce((sum, m) => sum + m.delta, 0);
}

export function subscribeStockJournal(cb: () => void): () => void {
  journalListeners.add(cb);
  return () => journalListeners.delete(cb);
}

export function getJournalForRicambio(ricambioId: string): readonly PendingStockMutation[] {
  return [...(journalByRicambio.get(ricambioId.trim()) ?? [])];
}

export function enqueueJournalEntry(entry: PendingStockMutation): void {
  const id = entry.ricambioId.trim();
  const list = journalByRicambio.get(id) ?? [];
  list.push(entry);
  journalByRicambio.set(id, list);
  logStockPipelineEvent({
    source: "journal",
    operationId: entry.operationId,
    ricambioId: id,
    delta: entry.delta,
    detail: `enqueue:${entry.status}`,
  });
  notifyJournal();
}

export function updateJournalEntry(
  ricambioId: string,
  operationId: string,
  patch: Partial<PendingStockMutation>,
): void {
  const id = ricambioId.trim();
  const opId = operationId.trim();
  const list = journalByRicambio.get(id);
  if (!list) return;
  const idx = list.findIndex((m) => m.operationId === opId);
  if (idx < 0) return;
  list[idx] = { ...list[idx]!, ...patch };
  notifyJournal();
}

export function pruneConfirmedJournal(ricambioId: string, maxAgeMs = 60_000): void {
  const id = ricambioId.trim();
  const list = journalByRicambio.get(id);
  if (!list) return;
  const now = Date.now();
  const next = list.filter((m) => {
    if (m.status === "queued" || m.status === "processing") return true;
    const doneAt = m.completedAt ?? m.createdAt;
    return now - doneAt < maxAgeMs;
  });
  if (next.length === 0) journalByRicambio.delete(id);
  else journalByRicambio.set(id, next);
  notifyJournal();
}

export function getStockDisplayState(qc: QueryClient, ricambioId: string): StockDisplayState {
  const id = ricambioId.trim();
  const entity = getStockEntity(qc, id);
  const certifiedQuantita = entity?.quantita ?? 0;
  const certifiedVersion = entity?.stockVersion ?? 0;
  const list = journalByRicambio.get(id) ?? [];
  const active = activeMutations(list);
  const pendingDelta = pendingDeltaFor(list);
  return {
    certifiedQuantita,
    certifiedVersion,
    pendingDelta,
    displayQuantita: Math.max(0, certifiedQuantita + pendingDelta),
    pendingCount: active.length,
    isPending: active.length > 0,
  };
}

export function tryConfirmJournalMutation(
  qc: QueryClient,
  ricambioId: string,
  operationId: string,
  response: StockAdjustResponse,
): boolean {
  const id = ricambioId.trim();
  const certifiedVersion = getStockEntity(qc, id)?.stockVersion ?? 0;
  if (response.stockVersion < certifiedVersion) {
    logStockPipelineEvent({
      source: "journal",
      operationId,
      ricambioId: id,
      responseVersion: response.stockVersion,
      expectedVersion: certifiedVersion,
      detail: "confirm_rejected_stale",
    });
    updateJournalEntry(id, operationId, { status: "failed", completedAt: Date.now() });
    return false;
  }
  updateJournalEntry(id, operationId, {
    status: "confirmed",
    completedAt: Date.now(),
    responseVersion: response.stockVersion,
  });
  pruneConfirmedJournal(id);
  return true;
}

function persistJournalToSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: Record<string, PendingStockMutation[]> = {};
    for (const [ricambioId, list] of journalByRicambio) {
      const active = list.filter((m) => m.status === "queued" || m.status === "processing");
      if (active.length > 0) payload[ricambioId] = active;
    }
    if (Object.keys(payload).length === 0) {
      sessionStorage.removeItem(STOCK_JOURNAL_STORAGE_KEY);
    } else {
      sessionStorage.setItem(STOCK_JOURNAL_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    /* quota / private mode */
  }
}

export function hydrateJournalFromSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STOCK_JOURNAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, PendingStockMutation[]>;
    const now = Date.now();
    for (const [ricambioId, list] of Object.entries(parsed)) {
      const revived = list.map((m) => {
        if (m.status === "processing" && now - m.createdAt > STOCK_JOURNAL_PROCESSING_TTL_MS) {
          return { ...m, status: "failed" as const, completedAt: now };
        }
        if (m.status === "queued") return { ...m, status: "queued" as const };
        return m;
      });
      journalByRicambio.set(ricambioId, revived);
    }
    notifyJournal();
  } catch {
    sessionStorage.removeItem(STOCK_JOURNAL_STORAGE_KEY);
  }
}

export function clearStockClientStoreForTest(): void {
  journalByRicambio.clear();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STOCK_JOURNAL_STORAGE_KEY);
  }
}
