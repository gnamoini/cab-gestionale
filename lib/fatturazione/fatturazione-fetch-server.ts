import "server-only";

import { cache } from "react";
import { CUSTOMER_OPEN_ITEMS_COLUMNS, CUSTOMER_PAYMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchInvoiceListPayload } from "@/lib/fatturazione/fatturazione-fetch";
import type { InvoiceDetail, InvoiceListPayload } from "@/lib/fatturazione/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { CustomerOpenItemRow, CustomerPaymentRow } from "@/src/types/supabase-tables";

async function fatturazioneReadGuard(): Promise<Awaited<ReturnType<typeof createSupabaseServerUserClient>> | null> {
  const allowed = await verifyServerPageRead("fatturazione");
  if (!allowed) return null;
  return createSupabaseServerUserClient();
}

export const fetchInvoiceListPayloadServer = cache(async (): Promise<ServiceResult<InvoiceListPayload>> => {
  const sb = await fatturazioneReadGuard();
  if (!sb) return err("Permesso richiesto.");
  return fetchInvoiceListPayload(sb);
});

export const fetchFatturazioneOpenItemsServer = cache(async (): Promise<ServiceResult<CustomerOpenItemRow[]>> => {
  const sb = await fatturazioneReadGuard();
  if (!sb) return err("Permesso richiesto.");
  const { data, error } = await sb
    .from("customer_open_items")
    .select(CUSTOMER_OPEN_ITEMS_COLUMNS)
    .neq("status", "closed")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) return err(error.message);
  return success((data ?? []) as CustomerOpenItemRow[]);
});

export const fetchFatturazionePaymentsServer = cache(async (): Promise<ServiceResult<CustomerPaymentRow[]>> => {
  const sb = await fatturazioneReadGuard();
  if (!sb) return err("Permesso richiesto.");
  const { data, error } = await sb
    .from("customer_payments")
    .select(CUSTOMER_PAYMENTS_COLUMNS)
    .order("data", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as CustomerPaymentRow[]);
});

export async function fetchInvoiceDetailServer(id: string): Promise<ServiceResult<InvoiceDetail>> {
  const allowed = await verifyServerPageRead("fatturazione");
  if (!allowed) return err("Permesso richiesto.");
  const list = await fetchInvoiceListPayloadServer();
  if (!list.success || !list.data) return err(list.error ?? "Errore caricamento.");
  const invoice = list.data.invoices.find((i) => i.id === id);
  if (!invoice) return err("Fattura non trovata.");
  return success({
    invoice,
    rows: list.data.rows.filter((r) => r.invoice_id === id),
    links: list.data.links.filter((l) => l.invoice_id === id),
    payments: list.data.payments.filter((p) => p.invoice_id === id),
  });
}
