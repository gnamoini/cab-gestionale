"use client";

import { fatturazioneListQueryKey } from "@/lib/render/query-key-factory";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";

const FATTURAZIONE_LIST_SCOPE = "fatturazione.list" as const;

export function useInvoicesQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = fatturazioneListQueryKey();
  const q = useSharedEntityQuery({
    queryKey,
    queryFn: () => invoicesEntry.getList(),
    entityType: "fatturazione",
    scope: "list",
    ownershipScopeKey: FATTURAZIONE_LIST_SCOPE,
    expectedServerKey: queryKey,
    enabled,
    ...gestOpts,
  });

  const payload = q.data;
  return {
    payload,
    invoices: payload?.invoices ?? [],
    rows: payload?.rows ?? [],
    links: payload?.links ?? [],
    payments: payload?.payments ?? [],
    customers: payload?.customers ?? [],
    preventiviBilling: payload?.preventiviBilling ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}
