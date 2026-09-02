/**
 * SSOT decisione banner dirty — origine locale/sessione vs incorporazione in cache.
 *
 * ponytail: invariante architetturale — register local mutation / operation_id PRIMA
 * di qualsiasi server mutation; dispatch/ack solo on success; abort marker on failure.
 */

import type { QueryClient } from "@tanstack/react-query";
import { isKnownStockOperation } from "@/lib/magazzino/stock-operation-registry";
import { isSelfOriginatedStockRealtimeEvent } from "@/lib/magazzino/stock-realtime-self-echo";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import { isOperationalBaselineAckPending } from "@/lib/sync/operational-data-version";
import { isOperationalSessionWarmingUp } from "@/lib/sync/operational-session-warmup";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";
import type { GestionaleActionSource } from "@/lib/sync/gestionale-sync-dispatch";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type DirtyDecisionReason =
  | "self_originated"
  | "already_incorporated"
  | "remote_not_incorporated"
  | "unknown_origin";

export type DirtyDecision =
  | { action: "skip"; reason: "self_originated" | "already_incorporated" }
  | { action: "mark"; reason: "remote_not_incorporated" | "unknown_origin" };

export type IncorporationOutcome = "incorporated" | "not_incorporated" | "unknown";

export type GestionaleDirtyPayloadHint = {
  stock_version?: number | string | null;
  updated_at?: string | null;
  operation_id?: string | null;
  ricambio_id?: string | null;
  id?: string | null;
};

export type DecideGestionaleDirtyInput = {
  table: string;
  entityId?: string | null;
  source?: GestionaleActionSource;
  queryClient?: QueryClient | null;
  payload?: GestionaleDirtyPayloadHint | null;
};

function parseStockVersion(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseUpdatedAtMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function ricambioIdFromInput(input: DecideGestionaleDirtyInput): string | null {
  const fromEntity = input.entityId?.trim();
  if (fromEntity && input.table === "magazzino_ricambi") return fromEntity;
  const fromPayload = input.payload?.ricambio_id?.trim() || input.payload?.id?.trim();
  if (fromPayload) return fromPayload;
  if (input.table === "movimenti_ricambi" && fromEntity) {
    // movimento id — incorporation uses ricambio_id on payload when present
    return input.payload?.ricambio_id?.trim() || null;
  }
  return fromEntity || null;
}

function getMagazzinoListRow(
  qc: QueryClient | null | undefined,
  ricambioId: string,
): MagazzinoRicambioRow | null {
  if (!qc) return null;
  const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
  const row = rows?.find((r) => r.id === ricambioId);
  return row ?? null;
}

/** Confronto versione/timestamp payload vs cache — senza assumere incorporazione se dati assenti. */
export function compareRemoteChangeIncorporation(
  qc: QueryClient | null | undefined,
  table: string,
  ricambioId: string | null,
  payload?: GestionaleDirtyPayloadHint | null,
): IncorporationOutcome {
  if (table !== "magazzino_ricambi" && table !== "movimenti_ricambi") {
    return "unknown";
  }

  const id = ricambioId?.trim() || payload?.ricambio_id?.trim() || payload?.id?.trim() || null;
  if (!id) return "unknown";

  const payloadStockVersion = parseStockVersion(payload?.stock_version);
  const row = getMagazzinoListRow(qc, id);
  const cacheStockVersion = row ? parseStockVersion(row.stock_version) : null;

  if (payloadStockVersion != null) {
    if (cacheStockVersion == null) return "not_incorporated";
    if (payloadStockVersion > cacheStockVersion) return "not_incorporated";
    return "incorporated";
  }

  const payloadUpdatedAt = parseUpdatedAtMs(payload?.updated_at);
  const cacheUpdatedAt = parseUpdatedAtMs(row?.updated_at);

  if (payload?.updated_at != null && payloadUpdatedAt != null && cacheUpdatedAt != null) {
    if (payloadUpdatedAt > cacheUpdatedAt) return "not_incorporated";
    return "incorporated";
  }

  return "unknown";
}

function isSelfOriginatedRemoteEvent(input: DecideGestionaleDirtyInput): boolean {
  const table = input.table;
  const entityId = input.entityId ?? undefined;
  const payload = input.payload;

  if (shouldSuppressRemoteCacheInvalidation(table, entityId)) {
    return true;
  }

  const operationId = payload?.operation_id?.trim();
  if (operationId && isKnownStockOperation(operationId)) {
    return true;
  }

  if (table === "magazzino_ricambi" || table === "movimenti_ricambi") {
    const record = {
      id: payload?.id ?? entityId ?? undefined,
      stock_version: parseStockVersion(payload?.stock_version) ?? undefined,
      operation_id: payload?.operation_id,
      ricambio_id: payload?.ricambio_id ?? (table === "movimenti_ricambi" ? undefined : entityId),
    };
    if (isSelfOriginatedStockRealtimeEvent(table, record)) {
      return true;
    }
  }

  return false;
}

export function decideGestionaleDirty(input: DecideGestionaleDirtyInput): DirtyDecision {
  if (isOperationalSessionWarmingUp()) {
    return { action: "skip", reason: "self_originated" };
  }
  if (isOperationalBaselineAckPending(input.table)) {
    return { action: "skip", reason: "self_originated" };
  }

  if (isSelfOriginatedRemoteEvent(input)) {
    return { action: "skip", reason: "self_originated" };
  }

  const ricambioId = ricambioIdFromInput(input);
  const incorporation = compareRemoteChangeIncorporation(
    input.queryClient,
    input.table,
    ricambioId,
    input.payload,
  );

  if (incorporation === "incorporated") {
    return { action: "skip", reason: "already_incorporated" };
  }
  if (incorporation === "not_incorporated") {
    return { action: "mark", reason: "remote_not_incorporated" };
  }

  return { action: "mark", reason: "unknown_origin" };
}

export function shouldSkipGestionaleDirtyMark(input: DecideGestionaleDirtyInput): boolean {
  return decideGestionaleDirty(input).action === "skip";
}
