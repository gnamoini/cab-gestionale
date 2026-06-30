import {
  BILLING_CUSTOMERS_COLUMNS,
  INVOICE_LINKS_COLUMNS,
  INVOICE_PAYMENTS_COLUMNS,
  INVOICE_ROWS_COLUMNS,
  INVOICES_COLUMNS,
  PREVENTIVI_BILLING_STATUS_COLUMNS,
} from "@/lib/db/table-select-columns";
import type { InvoiceListPayload } from "@/lib/fatturazione/types";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  BillingCustomerRow,
  InvoiceLineRow,
  InvoiceLinkRow,
  InvoicePaymentRow,
  InvoiceRow,
  PreventivoBillingStatusRow,
} from "@/src/types/supabase-tables";

export async function fetchInvoiceListPayload(
  sb: SupabaseClient,
): Promise<ServiceResult<InvoiceListPayload>> {
  const { data: invoicesData, error: invoicesError } = await sb
    .from("invoices")
    .select(INVOICES_COLUMNS)
    .order("data_emissione", { ascending: false })
    .order("numero", { ascending: false });
  if (invoicesError) return err(invoicesError.message);

  const invoices = (invoicesData ?? []) as InvoiceRow[];
  const ids = invoices.map((i) => i.id);

  const [rowsRes, linksRes, paymentsRes, customersRes, billingRes] = await Promise.all([
    ids.length
      ? sb.from("invoice_rows").select(INVOICE_ROWS_COLUMNS).in("invoice_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? sb.from("invoice_links").select(INVOICE_LINKS_COLUMNS).in("invoice_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? sb.from("invoice_payments").select(INVOICE_PAYMENTS_COLUMNS).in("invoice_id", ids).order("data", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    sb.from("billing_customers").select(BILLING_CUSTOMERS_COLUMNS).order("cliente_label", { ascending: true }),
    sb.from("preventivi_billing_status").select(PREVENTIVI_BILLING_STATUS_COLUMNS),
  ]);

  if (rowsRes.error) return err(rowsRes.error.message);
  if (linksRes.error) return err(linksRes.error.message);
  if (paymentsRes.error) return err(paymentsRes.error.message);
  if (customersRes.error) return err(customersRes.error.message);
  if (billingRes.error) return err(billingRes.error.message);

  return success({
    invoices,
    rows: (rowsRes.data ?? []) as InvoiceLineRow[],
    links: (linksRes.data ?? []) as InvoiceLinkRow[],
    payments: (paymentsRes.data ?? []) as InvoicePaymentRow[],
    customers: (customersRes.data ?? []) as BillingCustomerRow[],
    preventiviBilling: (billingRes.data ?? []) as PreventivoBillingStatusRow[],
  });
}
