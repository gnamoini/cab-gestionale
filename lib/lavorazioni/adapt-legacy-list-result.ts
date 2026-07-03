import type { UseQueryResult } from "@tanstack/react-query";
import type { ListQueryResult } from "@/lib/domain/list-types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** R-10b: structural-only — rename/nullability/shape; no filter, no enrichment. */
export function adaptLegacyToListQueryResult(
  query: UseQueryResult<LavorazioneListRow[], Error>,
): ListQueryResult<LavorazioneListRow> {
  const data = query.data ?? [];
  return {
    data,
    meta: { pagesCount: query.data !== undefined ? 1 : 0 },
    controls: {
      fetchNextPage: () => {
        /* no-op — legacy full-list fetch (PR-0) */
      },
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ?? null,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: () => query.refetch(),
  };
}
