"use client";

import { ordiniFornitoriListQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";

const ORDINI_LIST_SCOPE = "ordini_fornitori.list" as const;

export function useOrdiniFornitoriQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = ordiniFornitoriListQueryKey();
  const q = useSharedEntityQuery({
    queryKey,
    queryFn: () => ordiniFornitoriEntry.getList(),
    entityType: "ordini_fornitori",
    scope: "list",
    ownershipScopeKey: ORDINI_LIST_SCOPE,
    expectedServerKey: queryKey,
    enabled,
    ...gestOpts,
  });

  return {
    records: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => q.refetch(),
  };
}
