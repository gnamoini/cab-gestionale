"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { measureAsync } from "@/lib/observability/perf";
import type { ObsOperation } from "@/lib/observability/types";
import type { ServiceResult } from "@/src/services/service-result";

export function useServiceQuery<TData, TKey extends readonly unknown[]>(
  queryKey: TKey,
  queryFn: () => Promise<ServiceResult<TData>>,
  options?: Omit<UseQueryOptions<TData, Error, TData, TKey>, "queryKey" | "queryFn"> & {
    obsOperation?: ObsOperation;
  },
) {
  const { obsOperation = "crud", ...queryOptions } = options ?? {};
  const label = `query:${JSON.stringify(queryKey).slice(0, 80)}`;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await measureAsync(label, obsOperation, queryFn);
      if (!res.success) throw new Error(res.error ?? "Errore servizio");
      return res.data as TData;
    },
    ...queryOptions,
  });
}
