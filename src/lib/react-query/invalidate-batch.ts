import type { QueryClient } from "@tanstack/react-query";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  markEntitiesInvalidated,
  shouldSkipEntityRefetch,
} from "@/lib/sync/recent-entity-invalidation";
import {
  executeInvalidateGestionaleTables,
  type InvalidateGestionaleTablesOptions,
} from "@/src/lib/react-query/invalidate-targets";

export const INVALIDATE_BATCH_WINDOW_MS = 100;

type QueryKeyTuple = readonly unknown[];

type PendingTableBatch = {
  tables: Set<string>;
  entityIdByTable: Map<string, string>;
  refetchType: "active" | "all" | "none";
  includePortal: boolean;
  forcePrefix: boolean;
  cabSyncEvents: CabSyncEvent[];
  timer: ReturnType<typeof setTimeout> | null;
};

type PendingKeyBatch = {
  keys: QueryKeyTuple[];
  refetchType: "active" | "all" | "none";
  timer: ReturnType<typeof setTimeout> | null;
};

export type EnqueueInvalidateOptions = InvalidateGestionaleTablesOptions & {
  entityIdByTable?: ReadonlyMap<string, string>;
  cabSyncEvents?: CabSyncEvent[];
};

const tableBatches = new WeakMap<QueryClient, PendingTableBatch>();
const keyBatches = new WeakMap<QueryClient, PendingKeyBatch>();

function getTableBatch(qc: QueryClient): PendingTableBatch {
  let batch = tableBatches.get(qc);
  if (!batch) {
    batch = {
      tables: new Set(),
      entityIdByTable: new Map(),
      refetchType: "active",
      includePortal: true,
      forcePrefix: false,
      cabSyncEvents: [],
      timer: null,
    };
    tableBatches.set(qc, batch);
  }
  return batch;
}

function hasDestructiveCabEvents(events: CabSyncEvent[]): boolean {
  return events.some((e) => e.type === "entity_created" || e.type === "entity_deleted");
}

function mergeEnqueueOptions(batch: PendingTableBatch, options?: EnqueueInvalidateOptions): void {
  if (options?.refetchType) batch.refetchType = options.refetchType;
  if (options?.includePortal === false) batch.includePortal = false;
  if (options?.forcePrefix) batch.forcePrefix = true;
  if (options?.cabSyncEvents?.length) batch.cabSyncEvents.push(...options.cabSyncEvents);
  if (options?.entityIdByTable) {
    for (const [table, id] of options.entityIdByTable) {
      if (table && id) batch.entityIdByTable.set(table, id);
    }
  }
}

export function flushInvalidateBatch(qc: QueryClient): void {
  const batch = tableBatches.get(qc);
  if (!batch || batch.tables.size === 0) return;

  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }

  const tables = [...batch.tables];
  const entityIdByTable = new Map(batch.entityIdByTable);
  const cabSyncEvents = [...batch.cabSyncEvents];
  const opts: InvalidateGestionaleTablesOptions = {
    refetchType: batch.refetchType,
    includePortal: batch.includePortal,
    entityIdByTable,
    cabSyncEvents,
    forcePrefix: batch.forcePrefix || hasDestructiveCabEvents(cabSyncEvents),
  };

  batch.tables.clear();
  batch.entityIdByTable.clear();
  batch.cabSyncEvents = [];
  batch.forcePrefix = false;
  batch.refetchType = "active";
  batch.includePortal = true;

  executeInvalidateGestionaleTables(qc, tables, opts);
  markEntitiesInvalidated(entityIdByTable);
}

function flushQueryKeyBatch(qc: QueryClient): void {
  const batch = keyBatches.get(qc);
  if (!batch || batch.keys.length === 0) return;

  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }

  const keys = batch.keys;
  const refetchType = batch.refetchType;
  batch.keys = [];
  batch.refetchType = "active";

  const seen = new Set<string>();
  for (const key of keys) {
    const fp = JSON.stringify(key);
    if (seen.has(fp)) continue;
    seen.add(fp);
    void qc.invalidateQueries({ queryKey: key, refetchType });
  }
}

export function enqueueInvalidateGestionaleTables(
  qc: QueryClient,
  tables: string[],
  options?: EnqueueInvalidateOptions,
): void {
  const uniqueTables = [...new Set(tables.filter(Boolean))];
  if (uniqueTables.length === 0) return;

  const immediate =
    options?.immediate === true || hasDestructiveCabEvents(options?.cabSyncEvents ?? []);

  if (immediate) {
    executeInvalidateGestionaleTables(qc, uniqueTables, {
      refetchType: options?.refetchType,
      includePortal: options?.includePortal,
      entityIdByTable: options?.entityIdByTable,
      cabSyncEvents: options?.cabSyncEvents,
      forcePrefix: options?.forcePrefix || hasDestructiveCabEvents(options?.cabSyncEvents ?? []),
    });
    if (options?.entityIdByTable) markEntitiesInvalidated(options.entityIdByTable);
    return;
  }

  const batch = getTableBatch(qc);
  mergeEnqueueOptions(batch, options);

  for (const table of uniqueTables) {
    const entityId = options?.entityIdByTable?.get(table) ?? batch.entityIdByTable.get(table);
    if (entityId && shouldSkipEntityRefetch(table, entityId)) continue;
    batch.tables.add(table);
  }

  if (batch.tables.size === 0) return;

  if (batch.timer) clearTimeout(batch.timer);
  batch.timer = setTimeout(() => {
    batch.timer = null;
    flushInvalidateBatch(qc);
  }, INVALIDATE_BATCH_WINDOW_MS);
}

export function enqueueInvalidateQueryKeys(
  qc: QueryClient,
  keys: QueryKeyTuple[],
  options?: { refetchType?: "active" | "all" | "none"; immediate?: boolean },
): void {
  if (keys.length === 0) return;
  const refetchType = options?.refetchType ?? "active";

  if (options?.immediate) {
    const seen = new Set<string>();
    for (const key of keys) {
      const fp = JSON.stringify(key);
      if (seen.has(fp)) continue;
      seen.add(fp);
      void qc.invalidateQueries({ queryKey: key, refetchType });
    }
    return;
  }

  let batch = keyBatches.get(qc);
  if (!batch) {
    batch = { keys: [], refetchType: "active", timer: null };
    keyBatches.set(qc, batch);
  }
  batch.keys.push(...keys);
  batch.refetchType = refetchType;

  if (batch.timer) clearTimeout(batch.timer);
  batch.timer = setTimeout(() => {
    batch!.timer = null;
    flushQueryKeyBatch(qc);
  }, INVALIDATE_BATCH_WINDOW_MS);
}

export function flushAllInvalidateBatches(qc: QueryClient): void {
  flushInvalidateBatch(qc);
  flushQueryKeyBatch(qc);
}

/** Invalidazione mirata con batch (default) o immediate. */
export function invalidateGestionaleTablesTargeted(
  qc: QueryClient,
  tables: string[],
  options?: EnqueueInvalidateOptions,
): void {
  enqueueInvalidateGestionaleTables(qc, tables, options);
}
