"use client";

import { ordiniFornitoriListQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";

export function useOrdiniFornitoriQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const q = useServiceQuery(
    ordiniFornitoriListQueryKey(),
    () => ordiniFornitoriEntry.getList(),
    {
      enabled,
      ...gestOpts,
    },
  );

  return {
    records: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}
