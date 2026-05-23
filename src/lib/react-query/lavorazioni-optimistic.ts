import type { QueryClient } from "@tanstack/react-query";
import { LAVORAZIONI_STATI_CHIUSE } from "@/src/services/lavorazioni.service";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
import { QK } from "@/src/lib/react-query/query-keys";
import { enqueueInvalidateQueryKeys } from "@/src/lib/react-query/invalidate-batch";

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

function rowBelongsInArchivedList(row: LavorazioneListRow, listArchived: boolean | null): boolean {
  if (listArchived == null) return true;
  return listArchived ? row.archived === true : row.archived !== true;
}

function isStatoChiuso(stato: string | undefined): boolean {
  if (!stato) return false;
  return (LAVORAZIONI_STATI_CHIUSE as readonly string[]).includes(stato);
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
      queryKey: lavorazioniDomainQueryKeys.base(lavorazioneId),
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
  const listEntries = qc.getQueriesData<LavorazioneListRow[]>({
    queryKey: QK.lavorazioniQueries,
    predicate: (q) => isListQueryKey(q.queryKey),
  });

  for (const [queryKey, old] of listEntries) {
    if (!old?.length) continue;
    const listArchived = parseListFilterArchived(queryKey as readonly unknown[]);
    const patched = old.map((row) => {
      if (row.id !== lavorazioneId) return row;
      return mergeListRow(row, patch, serverRow);
    });
    const next = patched.filter((row) => {
      if (row.id !== lavorazioneId) return true;
      if (patch.stato && !serverRow) {
        const becameChiuso = isStatoChiuso(patch.stato);
        if (listArchived == null) return true;
        return listArchived ? becameChiuso : !becameChiuso;
      }
      return rowBelongsInArchivedList(row, listArchived);
    });
    qc.setQueryData(queryKey, next);
  }

  if (serverRow) {
    qc.setQueryData(lavorazioniDomainQueryKeys.base(lavorazioneId), serverRow);
  } else if (Object.keys(patch).length > 0) {
    qc.setQueriesData<LavorazioneRow>(
      { queryKey: lavorazioniDomainQueryKeys.base(lavorazioneId) },
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

/** Invalidazione leggera post-update rapido (log batched + coerenza finale via Realtime). */
export function settleLavorazioneQuickUpdate(qc: QueryClient, hadError: boolean): void {
  if (hadError) {
    void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
  }
  enqueueInvalidateQueryKeys(qc, [QK.log]);
}
