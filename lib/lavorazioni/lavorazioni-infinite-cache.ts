import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { flattenPages } from "@/lib/domain/list-flatten";
import type { Page } from "@/lib/domain/list-types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type LavorazioniInfiniteListData = InfiniteData<Page<LavorazioneListRow>>;

export function isLavorazioniInfiniteListCacheData(data: unknown): data is LavorazioniInfiniteListData {
  return (
    typeof data === "object" &&
    data !== null &&
    "pages" in data &&
    Array.isArray((data as LavorazioniInfiniteListData).pages)
  );
}

export function emptyLavorazioniInfiniteListData(): LavorazioniInfiniteListData {
  return {
    pages: [{ rows: [], pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: 0 } }],
    pageParams: [null],
  };
}

/** SSR prefetch / legacy flat rows → shape atteso da `useInfiniteQuery`. */
export function lavorazioniInfiniteSeedFromRows(
  rows: readonly LavorazioneListRow[],
): LavorazioniInfiniteListData {
  return {
    pages: [
      {
        rows: [...rows],
        pageInfo: {
          hasNextPage: false,
          nextCursor: null,
          totalEstimate: rows.length,
        },
      },
    ],
    pageParams: [null],
  };
}

/** Legacy flat list cache — accetta array o seed infinite (dashboard SSR con flag paginazione). */
export function coerceLavorazioniListRowsFromCache(data: unknown): LavorazioneListRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (isLavorazioniInfiniteListCacheData(data)) return [...flattenPages(data.pages)];
  return [];
}

/** Ripara cache flat/scalar su chiavi `list-v2` prima che `InfiniteQueryObserver` legga `data.pages`. */
export function repairLavorazioniInfiniteListCacheEntry(
  qc: QueryClient,
  queryKey: readonly unknown[],
): void {
  const cached = qc.getQueryData(queryKey);
  if (cached == null || isLavorazioniInfiniteListCacheData(cached)) return;
  if (Array.isArray(cached)) {
    qc.setQueryData(queryKey, lavorazioniInfiniteSeedFromRows(cached));
    return;
  }
  qc.removeQueries({ queryKey, exact: true });
}
