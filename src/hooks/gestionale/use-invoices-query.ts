"use client";

import { fatturazioneListQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { invoicesService } from "@/src/services/invoices.service";

export function useInvoicesQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const q = useServiceQuery(fatturazioneListQueryKey(), () => invoicesService.getList(), {
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
