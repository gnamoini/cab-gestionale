"use client";

import { fatturazioneOpenItemsQueryKey } from "@/lib/render/query-key-factory";
import { CUSTOMER_OPEN_ITEMS_COLUMNS } from "@/lib/db/table-select-columns";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { success, err } from "@/src/services/service-result";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { CustomerOpenItemRow } from "@/src/types/supabase-tables";

async function fetchOpenItems() {
  const c = getBrowserSupabase();
  const { data, error } = await c
    .from("customer_open_items")
    .select(CUSTOMER_OPEN_ITEMS_COLUMNS)
    .neq("status", "closed")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) return err(error.message);
  return success((data ?? []) as CustomerOpenItemRow[]);
}

export function useFatturazioneOpenItemsQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const q = useServiceQuery(fatturazioneOpenItemsQueryKey(), fetchOpenItems, { enabled, ...gestOpts });
  return {
    items: q.data ?? [],
    isLoading: q.isLoading,
    refetch: () => void q.refetch(),
  };
}
