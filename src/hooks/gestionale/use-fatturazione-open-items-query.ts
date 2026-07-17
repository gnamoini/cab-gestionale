"use client";

import { fetchFatturazioneOpenItemsClient } from "@/lib/fatturazione/fatturazione-open-items-fetch";
import { fatturazioneOpenItemsQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";

const FATTURAZIONE_OPEN_ITEMS_SCOPE = "fatturazione.openItems" as const;

export function useFatturazioneOpenItemsQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = fatturazioneOpenItemsQueryKey();
  const q = useSharedEntityQuery({
    queryKey,
    queryFn: () => fetchFatturazioneOpenItemsClient(),
    entityType: "fatturazione",
    scope: "openItems",
    ownershipScopeKey: FATTURAZIONE_OPEN_ITEMS_SCOPE,
    expectedServerKey: queryKey,
    enabled,
    ...gestOpts,
  });
  return {
    items: q.data ?? [],
    isLoading: q.isLoading,
    refetch: () => void q.refetch(),
  };
}
