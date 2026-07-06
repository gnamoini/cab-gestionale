import "server-only";

import { cache } from "react";
import { fetchInvoiceListPayload } from "@/lib/fatturazione/fatturazione-fetch";
import type { InvoiceDetail, InvoiceListPayload } from "@/lib/fatturazione/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export const fetchInvoiceListPayloadServer = cache(async (): Promise<ServiceResult<InvoiceListPayload>> => {
  const allowed = await verifyServerPageRead("fatturazione");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchInvoiceListPayload(sb);
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
