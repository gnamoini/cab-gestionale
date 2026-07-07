"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { flattenPages } from "@/lib/domain/list-flatten";
import type { LavorazioniRpcListCursor } from "@/lib/domain/list-mapper";
import type { ListQueryResult, Page } from "@/lib/domain/list-types";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import { fetchLavorazioniListAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import {
  fetchLavorazioniListPageRpc,
  getNextLavorazioniPageParam,
} from "@/lib/lavorazioni/lavorazioni-paginated-fetch";
import { repairLavorazioniInfiniteListCacheEntry } from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { buildLavorazioniListKey } from "@/lib/react-query/build-list-keys";
import type { LavorazioneFilters, LavorazioneListRow } from "@/src/services/lavorazioni.service";

const LA_STALE_MS = 30_000;
const EMPTY_PAGES: readonly Page<LavorazioneListRow>[] = [];

export type UseLavorazioniListV2Opts = {
  enabled?: boolean;
  clientPortal?: boolean;
  staleTime?: number;
};

async function fetchLegacyAsSinglePage(
  filters: LavorazioneFilters | undefined,
  clientPortal: boolean,
): Promise<Page<LavorazioneListRow>> {
  const res = await fetchLavorazioniListAuthorized(filters, { clientPortal });
  if (!res.success) throw new Error(res.error ?? "Errore lista lavorazioni");
  const rows = res.data ?? [];
  return {
    rows,
    pageInfo: {
      hasNextPage: false,
      nextCursor: null,
      totalEstimate: rows.length,
    },
  };
}

/** V2 list hook — RPC paginated when possible; legacy single-page fallback (PR-1). */
export function useLavorazioniListV2(
  filters?: LavorazioneFilters,
  options?: UseLavorazioniListV2Opts,
): ListQueryResult<LavorazioneListRow> {
  const norm = normalizeLavorazioniFilters(filters);
  const clientPortal = options?.clientPortal === true;
  const enabled = options?.enabled !== false;
  const staleTime = options?.staleTime ?? LA_STALE_MS;
  const useRpc = !clientPortal && filters?.includeMezzo !== true && filters?.fetchMode !== "report";
  const queryKey = useMemo(() => buildLavorazioniListKey(norm, clientPortal), [norm, clientPortal]);
  const qc = useQueryClient();
  // ponytail: flat legacy cache su list-v2 fa crashare hasNextPage (data.pages undefined)
  repairLavorazioniInfiniteListCacheEntry(qc, queryKey);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (useRpc) {
        const res = await fetchLavorazioniListPageRpc(
          filters,
          (pageParam as LavorazioniRpcListCursor | null) ?? null,
          { clientPortal },
        );
        if (res.success && res.data) return res.data;
        if (res.error?.includes("extended filters")) {
          return fetchLegacyAsSinglePage(filters, clientPortal);
        }
        throw new Error(res.error ?? "Errore lista lavorazioni paginata");
      }
      return fetchLegacyAsSinglePage(filters, clientPortal);
    },
    initialPageParam: null as LavorazioniRpcListCursor | null,
    getNextPageParam: (lastPage) => getNextLavorazioniPageParam(lastPage),
    enabled,
    staleTime,
  });

  const pages = query.data?.pages ?? EMPTY_PAGES;
  const lastCursor =
    pages.length > 0 ? pages[pages.length - 1].pageInfo.nextCursor : null;
  const list = useMemo(
    () => flattenPages(pages),
    [pages.length, lastCursor, query.dataUpdatedAt],
  );

  return {
    data: list,
    meta: { pagesCount: pages.length },
    controls: {
      fetchNextPage: () => {
        void query.fetchNextPage();
      },
    },
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: () => query.refetch(),
  };
}
