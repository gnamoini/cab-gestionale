"use client";

import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { QK } from "@/src/lib/react-query/query-keys";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type MezziListCacheSnapshot = Array<[QueryKey, MezzoGestito[] | undefined]>;

export function snapshotMezziListCaches(queryClient: QueryClient): MezziListCacheSnapshot {
  return queryClient.getQueriesData<MezzoGestito[]>({ queryKey: QK.mezzi });
}

export function restoreMezziListCaches(queryClient: QueryClient, snapshot: MezziListCacheSnapshot): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/** Aggiornamento immediato lista mezzi (toggle tagliandi) — non dipende da invalidate deduplicata. */
export function patchMezzoTagliandiInListCaches(
  queryClient: QueryClient,
  mezzoId: string,
  enabled: boolean,
): void {
  queryClient.setQueriesData<MezzoGestito[]>({ queryKey: QK.mezzi }, (old) => {
    if (!old) return old;
    let changed = false;
    const next = old.map((m) => {
      if (m.id !== mezzoId) return m;
      changed = true;
      return { ...m, tagliandi: enabled ? true : undefined };
    });
    return changed ? next : old;
  });
}

export function patchMezzoTagliandiFromRow(queryClient: QueryClient, row: MezzoRow): void {
  const enabled = parseMezzoMeta(row.meta).tagliandi === true;
  patchMezzoTagliandiInListCaches(queryClient, row.id, enabled);
}
