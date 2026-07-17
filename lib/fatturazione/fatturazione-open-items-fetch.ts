import { CUSTOMER_OPEN_ITEMS_COLUMNS } from "@/lib/db/table-select-columns";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { CustomerOpenItemRow } from "@/src/types/supabase-tables";

export async function fetchFatturazioneOpenItemsClient(): Promise<ServiceResult<CustomerOpenItemRow[]>> {
  const c = getBrowserSupabase();
  const { data, error } = await c
    .from("customer_open_items")
    .select(CUSTOMER_OPEN_ITEMS_COLUMNS)
    .neq("status", "closed")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) return err(error.message);
  return success((data ?? []) as CustomerOpenItemRow[]);
}
