"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { registerDedupConsumerTag } from "@/lib/observability/query-dedup-audit";
import {
  shouldSkipClientInitialFetch,
  type QueryScopeKey,
} from "@/lib/render/query-ownership-registry";
import { assertQueryKeyAligned } from "@/lib/render/render-path-orchestrator";
import { useServiceQuery, type UseServiceQueryOptions } from "@/src/hooks/use-service-query";
import type { DedupScope } from "@/lib/query/query-dedup-registry";
import type { ServiceResult } from "@/src/services/service-result";

export type UseSharedEntityQueryOptions<TData, TKey extends readonly unknown[]> = UseServiceQueryOptions<
  TData,
  TKey
> & {
  entityType: string;
  entityId?: string;
  scope: DedupScope;
  queryKey: TKey;
  queryFn: () => Promise<ServiceResult<TData>>;
  ownershipScopeKey?: QueryScopeKey;
  expectedServerKey?: readonly unknown[];
};

export function useSharedEntityQuery<TData, TKey extends readonly unknown[]>(
  options: UseSharedEntityQueryOptions<TData, TKey>,
) {
  const {
    entityType,
    entityId,
    scope,
    queryKey,
    queryFn,
    dedupTag,
    ownershipScopeKey,
    expectedServerKey,
    staleTime,
    ...rest
  } = options;

  const queryClient = useQueryClient();

  const dehydratedData = queryClient.getQueryData<TData>(queryKey);
  const hasDehydratedData = dehydratedData !== undefined;
  const skipInitialFetch =
    ownershipScopeKey != null && shouldSkipClientInitialFetch(ownershipScopeKey, hasDehydratedData);

  useEffect(() => {
    if (dedupTag) registerDedupConsumerTag(queryKey, dedupTag);
  }, [queryKey, dedupTag]);

  useEffect(() => {
    if (expectedServerKey) assertQueryKeyAligned(expectedServerKey, queryKey, `${entityType}:${scope}`);
  }, [expectedServerKey, queryKey, entityType, scope]);

  const hydrationDefaults = useMemo((): Partial<UseQueryOptions<TData, Error, TData, TKey>> => {
    if (!skipInitialFetch) return {};
    return {
      refetchOnMount: false,
      initialData: dehydratedData,
    };
  }, [skipInitialFetch, dehydratedData]);

  return useServiceQuery(queryKey, queryFn, {
    ...rest,
    staleTime,
    dedupTag,
    dedupMeta: { entityType, entityId, scope },
    ...hydrationDefaults,
  });
}
