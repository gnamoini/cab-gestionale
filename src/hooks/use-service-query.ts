"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { recordQueryFetch } from "@/lib/observability/query-fetch-counter";
import { measureAsync } from "@/lib/observability/perf";
import type { ObsOperation } from "@/lib/observability/types";
import { dedupQuery, type DedupQueryMeta } from "@/lib/query/dedup-query";
import type { ServiceResult } from "@/src/services/service-result";

function serviceQueryAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

/** Reject the query promise on abort — never throw from an abort listener (uncaught runtime error). */
function runWithAbortSignal<T>(signal: AbortSignal | undefined, run: () => Promise<T>): Promise<T> {
  if (!signal) return run();
  if (signal.aborted) return Promise.reject(serviceQueryAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(serviceQueryAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    run()
      .then((value) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) reject(serviceQueryAbortError());
        else resolve(value);
      })
      .catch((err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}

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
    queryFn: async ({ signal }) => {
      return dedupQuery(
        queryKey,
        () =>
          runWithAbortSignal(signal, async () => {
            recordQueryFetch(queryKey);
            const res = await measureAsync(label, obsOperation, queryFn);
            if (!res.success) throw new Error(res.error ?? "Errore servizio");
            return res.data as TData;
          }),
        { ...dedupMeta, consumerTag: dedupTag },
      );
    },
    ...queryOptions,
  });
}
