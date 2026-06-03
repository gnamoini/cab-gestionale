import type { QueryClient } from "@tanstack/react-query";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import { QK } from "@/src/lib/react-query/query-keys";

export type LavorazioniListSnapshot = {
  queryKey: readonly unknown[];
  data: LavorazioneListRow[] | undefined;
};

export type LavorazioneBaseSnapshot = {
  queryKey: readonly unknown[];
  data: LavorazioneRow | undefined;
};

export type LavorazioneUpdateOptimisticContext = {
  lists: LavorazioniListSnapshot[];
  bases: LavorazioneBaseSnapshot[];
};

function lavorazioneBaseQueryKey(lavorazioneId: string) {
  return [...QK.lavorazioniQueries, "base", lavorazioneId] as const;
}

function isListQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === QK.lavorazioniQueries[0] && queryKey[1] === "list";
}

function parseListFilterArchived(queryKey: readonly unknown[]): boolean | null {
  if (!isListQueryKey(queryKey) || typeof queryKey[2] !== "string") return null;
  try {
    const parsed = JSON.parse(queryKey[2]) as { ar?: number };
    if (parsed.ar === 1) return true;
    if (parsed.ar === 0) return false;
  } catch {
    /* ignore */
  }
  return null;
}

/** Membership lista: solo `archived` DB — stato workflow chiuso non sposta in archivio. */
function rowBelongsInArchivedList(row: LavorazioneListRow, listArchived: boolean | null): boolean {
  if (listArchived == null) return true;
  return listArchived ? row.archived === true : row.archived !== true;
}

function mergeListRow(
  row: LavorazioneListRow,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
): LavorazioneListRow {
  const merged = { ...row, ...patch, ...(serverRow ?? {}) } as LavorazioneListRow;
  if (serverRow) {
    merged.mezzo = row.mezzo;
  }
  return merged;
}

function findRowInListCaches(qc: QueryClient, lavorazioneId: string): LavorazioneListRow | undefined {
  const listEntries = qc.getQueriesData<LavorazioneListRow[]>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isListQueryKey(q.queryKey),
  });
  for (const [, old] of listEntries) {
    const hit = old?.find((r) => r.id === lavorazioneId);
    if (hit) return hit;
  }
  return undefined;
}

function resolveMergedRow(
  qc: QueryClient,
  lavorazioneId: string,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
): LavorazioneListRow | undefined {
  const existing = findRowInListCaches(qc, lavorazioneId);
  if (existing) return mergeListRow(existing, patch, serverRow);
  if (!serverRow) return undefined;
  const base = { ...serverRow, mezzo: null } as LavorazioneListRow;
  return mergeListRow(base, patch, serverRow);
}

function reconcileRowAcrossLists(qc: QueryClient, lavorazioneId: string, merged: LavorazioneListRow): void {
  const listEntries = qc.getQueriesData<LavorazioneListRow[]>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isListQueryKey(q.queryKey),
  });

  for (const [queryKey, old] of listEntries) {
    const listArchived = parseListFilterArchived(queryKey as readonly unknown[]);
    const belongs = rowBelongsInArchivedList(merged, listArchived);
    const prev = old ?? [];
    const hadRow = prev.some((r) => r.id === lavorazioneId);

    let next: LavorazioneListRow[];
    if (belongs) {
      next = hadRow ? prev.map((r) => (r.id === lavorazioneId ? merged : r)) : [...prev, merged];
    } else {
      next = prev.filter((r) => r.id !== lavorazioneId);
    }
    qc.setQueryData(queryKey, next);
  }
}

export async function snapshotLavorazioneUpdateQueries(
  qc: QueryClient,
  lavorazioneId: string,
): Promise<LavorazioneUpdateOptimisticContext> {
  await qc.cancelQueries({ queryKey: QK.lavorazioniQueries });

  const lists = qc
    .getQueriesData<LavorazioneListRow[]>({
      queryKey: QK.lavorazioniQueries,
      predicate: (q) => isListQueryKey(q.queryKey),
    })
    .map(([queryKey, data]) => ({ queryKey: queryKey as readonly unknown[], data }));

  const bases = qc
    .getQueriesData<LavorazioneRow>({
      queryKey: lavorazioneBaseQueryKey(lavorazioneId),
    })
    .map(([queryKey, data]) => ({ queryKey: queryKey as readonly unknown[], data }));

  return { lists, bases };
}

export function applyOptimisticLavorazioneUpdate(
  qc: QueryClient,
  lavorazioneId: string,
  patch: LavorazioneUpdate,
  serverRow?: LavorazioneRow,
): void {
  const merged = resolveMergedRow(qc, lavorazioneId, patch, serverRow);
  if (merged) {
    reconcileRowAcrossLists(qc, lavorazioneId, merged);
  }

  if (serverRow) {
    qc.setQueryData(lavorazioneBaseQueryKey(lavorazioneId), serverRow);
  } else if (Object.keys(patch).length > 0) {
    qc.setQueriesData<LavorazioneRow>(
      { queryKey: lavorazioneBaseQueryKey(lavorazioneId) },
      (old) => (old ? { ...old, ...patch } : old),
    );
  }
}

export function rollbackLavorazioneUpdateQueries(
  qc: QueryClient,
  context: LavorazioneUpdateOptimisticContext,
): void {
  for (const { queryKey, data } of context.lists) {
    qc.setQueryData(queryKey, data);
  }
  for (const { queryKey, data } of context.bases) {
    qc.setQueryData(queryKey, data);
  }
}

/** Patch optimistic allineata a `lavorazioniService.conclude` (archiviazione). */
export function buildConcludeOptimisticPatch(row: LavorazioneListRow | undefined): LavorazioneUpdate {
  const now = new Date().toISOString();
  return {
    stato: "completata",
    archived: true,
    archived_at: now,
    data_uscita: row?.data_uscita?.trim() ? row.data_uscita : now,
  };
}
