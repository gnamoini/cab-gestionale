"use client";

import { fetchFatturazionePaymentsClient } from "@/lib/fatturazione/fatturazione-payments-fetch";
import { fatturazionePaymentsQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import type { CustomerPaymentRow } from "@/src/types/supabase-tables";

const FATTURAZIONE_PAYMENTS_SCOPE = "fatturazione.payments" as const;

export function useFatturazionePaymentsQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = fatturazionePaymentsQueryKey();
  const q = useSharedEntityQuery({
    queryKey,
    queryFn: () => fetchFatturazionePaymentsClient(),
    entityType: "fatturazione",
    scope: "payments",
    ownershipScopeKey: FATTURAZIONE_PAYMENTS_SCOPE,
    expectedServerKey: queryKey,
    enabled,
    ...gestOpts,
  });
  return {
    payments: (q.data ?? []) as CustomerPaymentRow[],
    isLoading: q.isLoading,
    isInitialLoading: q.isLoading && q.data === undefined,
    refetch: () => void q.refetch(),
  };
}
