import { CUSTOMER_PAYMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { CustomerPaymentRow } from "@/src/types/supabase-tables";

export async function fetchFatturazionePaymentsClient(): Promise<ServiceResult<CustomerPaymentRow[]>> {
  const c = getBrowserSupabase();
  const { data, error } = await c
    .from("customer_payments")
    .select(CUSTOMER_PAYMENTS_COLUMNS)
    .order("data", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as CustomerPaymentRow[]);
}
