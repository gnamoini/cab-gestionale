"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PREVENTIVI_BILLING_STATUS_COLUMNS } from "@/lib/db/table-select-columns";
import { preventiviBillingQueryKey } from "@/lib/render/query-key-factory";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import type { PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

export function usePreventiviBillingQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = preventiviBillingQueryKey();
  const queryClient = useQueryClient();
  const dehydratedData = queryClient.getQueryData<PreventivoBillingStatusRow[]>(queryKey);
  const hasDehydratedData = dehydratedData !== undefined;

  const q = useQuery({
    queryKey,
    queryFn: async () => {
      const sb = getBrowserSupabase();
      const { data, error } = await sb.from("preventivi_billing_status").select(PREVENTIVI_BILLING_STATUS_COLUMNS);
      if (error) throw new Error(error.message);
      return (data ?? []) as PreventivoBillingStatusRow[];
    },
    enabled,
    ...gestOpts,
    ...(hasDehydratedData
      ? {
          refetchOnMount: false,
          initialData: dehydratedData,
        }
      : {}),
  });

  const byPreventivoId = useMemo(() => {
    const m = new Map<string, PreventivoBillingStatusRow>();
    for (const r of q.data ?? []) m.set(r.preventivo_id, r);
    return m;
  }, [q.data]);

  return {
    rows: q.data ?? [],
    byPreventivoId,
    isLoading: q.isLoading,
  };
}
