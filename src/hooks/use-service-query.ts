"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { recordQueryFetch } from "@/lib/observability/query-fetch-counter";
import { measureAsync } from "@/lib/observability/perf";
import type { ObsOperation } from "@/lib/observability/types";
import { dedupQuery, type DedupQueryMeta } from "@/lib/query/dedup-query";
import type { ServiceResult } from "@/src/services/service-result";

export type UseServiceQueryOptions<TData, TKey extends readonly unknown[]> = Omit<
  UseQueryOptions<TData, Error, TData, TKey>,
  "queryKey" | "queryFn"
> & {
  obsOperation?: ObsOperation;
  dedupTag?: string;
  dedupMeta?: Omit<DedupQueryMeta, "consumerTag">;
};

export function useServiceQuery<TData, TKey extends readonly unknown[]>(
  queryKey: TKey,
  queryFn: () => Promise<ServiceResult<TData>>,
  options?: UseServiceQueryOptions<TData, TKey>,
) {
  const { obsOperation = "crud", dedupTag, dedupMeta, ...queryOptions } = options ?? {};
  const label = `query:${JSON.stringify(queryKey).slice(0, 80)}`;

  return useQuery({
    queryKey,
    queryFn: async () => {
      return dedupQuery(
        queryKey,
        async () => {
          recordQueryFetch(queryKey);
          const res = await measureAsync(label, obsOperation, queryFn);
          if (!res.success) throw new Error(res.error ?? "Errore servizio");
          return res.data as TData;
        },
        { ...dedupMeta, consumerTag: dedupTag },
      );
    },
    ...queryOptions,
  });
}
