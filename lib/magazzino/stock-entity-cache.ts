"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  evaluateStockMerge,
  type StockMergeEntity,
  type StockMergeResult,
  type StockMergeSource,
} from "@/lib/magazzino/stock-merge-gate";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import { recordStockMergeTelemetry } from "@/lib/magazzino/stock-merge-telemetry";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type StockEntity = StockMergeEntity;

export const STOCK_ENTITY_QUERY_KEY = ["magazzino", "stock-entity"] as const;

function entityKey(ricambioId: string): readonly [typeof STOCK_ENTITY_QUERY_KEY[0], typeof STOCK_ENTITY_QUERY_KEY[1], string] {
  return [...STOCK_ENTITY_QUERY_KEY, ricambioId] as const;
}

const entityRegistry = new Map<string, StockEntity>();

export function stockEntityFromRow(
  row: Pick<MagazzinoRicambioRow, "id" | "quantita" | "stock_version">,
  lastOperationId?: string | null,
): StockEntity {
  return {
    ricambioId: row.id,
    quantita: Math.max(0, Math.round(Number(row.quantita) || 0)),
    stockVersion: Math.max(0, Math.round(Number(row.stock_version) || 0)),
    lastOperationId: lastOperationId?.trim() || null,
  };
}

export function getStockEntity(qc: QueryClient, ricambioId: string): StockEntity | null {
  const id = ricambioId.trim();
  if (!id) return null;

  const cached = qc.getQueryData<StockEntity>(entityKey(id));
  if (cached) return cached;

  const fromRegistry = entityRegistry.get(id);
  if (fromRegistry) return fromRegistry;

  const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
  const row = rows?.find((r) => r.id === id);
  if (!row) return null;

  return stockEntityFromRow(row);
}

function patchListRowQuantita(qc: QueryClient, entity: StockEntity): void {
  qc.setQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey(), (old) => {
    if (!old) return old;
    return old.map((row) =>
      row.id === entity.ricambioId
        ? { ...row, quantita: entity.quantita, stock_version: entity.stockVersion }
        : row,
    );
  });
}

export function mergeStockEntity(
  qc: QueryClient,
  incoming: StockEntity,
  source: StockMergeSource,
  telemetry?: {
    operationId?: string | null;
    expectedVersion?: number;
    receivedVersion?: number;
  },
): StockMergeResult {
  const cached = getStockEntity(qc, incoming.ricambioId);
  const result = evaluateStockMerge(incoming, cached);

  recordStockMergeTelemetry({
    ricambioId: incoming.ricambioId,
    operationId: telemetry?.operationId ?? incoming.lastOperationId,
    expectedVersion: telemetry?.expectedVersion,
    receivedVersion: telemetry?.receivedVersion ?? incoming.stockVersion,
    cacheVersion: cached?.stockVersion,
    mergeSource: source,
    decision: result.decision,
  });

  if (result.decision === "merge" && result.merged) {
    entityRegistry.set(result.merged.ricambioId, result.merged);
    qc.setQueryData(entityKey(result.merged.ricambioId), result.merged);
    patchListRowQuantita(qc, result.merged);
    logStockPipelineEvent({
      source: "merge_cache",
      ricambioId: result.merged.ricambioId,
      operationId: telemetry?.operationId ?? incoming.lastOperationId,
      expectedVersion: telemetry?.expectedVersion,
      responseVersion: result.merged.stockVersion,
      detail: source,
    });
  }

  return result;
}

export function seedStockEntitiesFromRows(
  qc: QueryClient,
  rows: readonly MagazzinoRicambioRow[],
): void {
  for (const row of rows) {
    const entity = stockEntityFromRow(row);
    entityRegistry.set(entity.ricambioId, entity);
    qc.setQueryData(entityKey(entity.ricambioId), entity);
  }
}

export function clearStockEntityRegistryForTest(): void {
  entityRegistry.clear();
}

export function getStockEntityRegistrySize(): number {
  return entityRegistry.size;
}
