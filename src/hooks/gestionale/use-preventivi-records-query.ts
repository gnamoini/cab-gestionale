"use client";

import {
  fetchPreventiviRecordsAuthorized,
  type PreventiviRecordsPayload,
} from "@/lib/preventivi/preventivi-list-fetch-authorized";
import { preventiviRecordsQueryKey } from "@/lib/render/query-key-factory";
import { usesServerSearch } from "@/lib/search/registry";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import type { PreventiviFilters } from "@/src/services/preventivi.service";

const PREVENTIVI_LIST_SCOPE = "preventivi.list" as const;

/** Lista preventivi — 1 query Supabase con embed mezzi (no join client). */
export function usePreventiviRecordsQuery(
  enabled = true,
  searchFilters?: Pick<PreventiviFilters, "search">,
) {
  const gestOpts = useGestionaleQueryOpts();
  const serverFilters: PreventiviFilters | undefined =
    usesServerSearch("preventivi") && searchFilters?.search?.trim()
      ? { search: searchFilters.search.trim() }
      : undefined;
  const queryKey = preventiviRecordsQueryKey(serverFilters ?? null);
  const q = useSharedEntityQuery({
    queryKey,
    queryFn: () => fetchPreventiviRecordsAuthorized(serverFilters),
    entityType: "preventivi",
    scope: "list",
    ownershipScopeKey: PREVENTIVI_LIST_SCOPE,
    expectedServerKey: queryKey,
    enabled,
    ...gestOpts,
  });

  const payload = q.data;
  const records = payload?.records ?? [];
  const mezziRows = payload?.mezziRows ?? [];

  return {
    records,
    mezziRows,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}

export type { PreventiviRecordsPayload };
