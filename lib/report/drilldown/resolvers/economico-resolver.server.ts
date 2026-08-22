import "server-only";

import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";
import type { InvoiceRow, InvoicePaymentRow } from "@/src/types/supabase-tables";

function isEmittedInvoice(inv: InvoiceRow): boolean {
  return inv.status !== "annullata" && inv.status !== "bozza" && inv.status !== "da_verificare";
}

function invoiceRow(inv: InvoiceRow): ReportDrillDownRow {
  return {
    id: inv.id,
    target: { entity: "fattura", id: inv.id },
    label: invoiceDisplayNumber(inv),
    sublabel: inv.cliente_label,
    amount: inv.totale,
    date: inv.data_emissione,
    status: inv.status,
  };
}

function matchesCustomer(inv: InvoiceRow, customerId: string | undefined): boolean {
  if (!customerId) return true;
  if (inv.customer_id === customerId) return true;
  const labelKey = `label:${inv.cliente_label.trim() || "—"}`;
  return customerId === labelKey;
}

export function listInvoicesFatturatoInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  customerId?: string,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const inv of bundle.invoices) {
    if (!isEmittedInvoice(inv)) continue;
    if (!isoInRange(inv.data_emissione, range)) continue;
    if (!matchesCustomer(inv, customerId)) continue;
    rows.push(invoiceRow(inv));
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listPaymentsIncassatoInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  customerId?: string,
): ReportDrillDownRow[] {
  const invById = new Map(bundle.invoices.map((i) => [i.id, i]));
  const rows: ReportDrillDownRow[] = [];

  if (bundle.invoicePayments.length > 0) {
    for (const p of bundle.invoicePayments) {
      if (!isoInRange(p.data, range)) continue;
      const inv = invById.get(p.invoice_id);
      if (!inv) continue;
      if (!matchesCustomer(inv, customerId)) continue;
      rows.push({
        id: p.id,
        target: { entity: "fattura", id: inv.id },
        label: invoiceDisplayNumber(inv),
        sublabel: `${inv.cliente_label} · ${p.metodo}`,
        amount: p.importo,
        date: p.data,
        status: "pagamento",
      });
    }
  } else {
    for (const inv of bundle.invoices) {
      if (inv.status === "annullata" || inv.status !== "pagata") continue;
      if (!isoInRange(inv.updated_at, range)) continue;
      if (!matchesCustomer(inv, customerId)) continue;
      rows.push({
        ...invoiceRow(inv),
        date: inv.updated_at,
        amount: inv.pagato > 0 ? inv.pagato : inv.totale,
      });
    }
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listInvoicesDaIncassare(
  bundle: ReportAnalyticsSourceBundle,
  customerId?: string,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const inv of bundle.invoices) {
    if (inv.status === "annullata") continue;
    if (inv.residuo <= 0) continue;
    if (!matchesCustomer(inv, customerId)) continue;
    rows.push({
      ...invoiceRow(inv),
      amount: inv.residuo,
    });
  }
  return rows.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}

export function listInvoicesOverdueSnapshot(
  bundle: ReportAnalyticsSourceBundle,
  customerId?: string,
  today = new Date(),
): ReportDrillDownRow[] {
  const todayYmd = today.toISOString().slice(0, 10);
  const rows: ReportDrillDownRow[] = [];
  for (const inv of bundle.invoices) {
    if (inv.status === "annullata") continue;
    if (inv.residuo <= 0) continue;
    if (inv.data_scadenza == null || inv.data_scadenza >= todayYmd) continue;
    if (!matchesCustomer(inv, customerId)) continue;
    rows.push({
      ...invoiceRow(inv),
      amount: inv.residuo,
      date: inv.data_scadenza,
    });
  }
  return rows.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}

export function resolveEconomicoDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  customerId?: string,
): ReportDrillDownRow[] {
  switch (metricId) {
    case "eco_fatturato":
      return listInvoicesFatturatoInRange(bundle, range, customerId);
    case "eco_incassato":
      return listPaymentsIncassatoInRange(bundle, range, customerId);
    case "eco_da_incassare":
      return listInvoicesDaIncassare(bundle, customerId);
    case "eco_importo_scaduto":
      return listInvoicesOverdueSnapshot(bundle, customerId);
    default:
      return [];
  }
}
